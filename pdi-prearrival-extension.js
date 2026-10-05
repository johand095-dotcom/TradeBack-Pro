/* =========================================================
   PDI PRE-ARRIVAL EXTENSION
   Stock Number + Allocated Salesperson
========================================================= */

(function () {
    "use strict";

    const $ = (id) =>
        document.getElementById(id);

    function getSupabase() {
        return window.supabaseClient || null;
    }

    function addPreArrivalFields() {
        if ($("preArrivalStockNo") || $("preArrivalSalesperson")) return;

        const anchor = $("preArrivalSupplier") || $("preArrivalMake") || $("preArrivalModel");
        if (!anchor) {
            console.warn("Pre-arrival extension: form anchor not found.");
            return;
        }

        const wrapper = anchor.closest(".prearrival-field, .form-field, div");
        if (!wrapper || !wrapper.parentElement) return;

        const host = document.createElement("div");
        host.id = "preArrivalExtensionFields";
        host.style.display = "contents";
        host.innerHTML = `
            <div class="prearrival-field">
                <label for="preArrivalStockNo">Stock Number</label>
                <input type="text" id="preArrivalStockNo" placeholder="Enter ELT stock number" autocomplete="off">
            </div>
            <div class="prearrival-field">
                <label for="preArrivalSalesperson">Allocated Salesperson</label>
                <select id="preArrivalSalesperson">
                    <option value="">Unallocated / select salesperson...</option>
                </select>
            </div>
        `;

        wrapper.parentElement.insertBefore(host, wrapper.nextSibling);
    }

    function normaliseRoles(roles) {
        if (!roles) return [];
        if (Array.isArray(roles)) return roles.map(role => String(role).trim().toLowerCase());

        if (typeof roles === "string") {
            try {
                const parsed = JSON.parse(roles);
                if (Array.isArray(parsed)) {
                    return parsed.map(role => String(role).trim().toLowerCase());
                }
            } catch (error) {
                return roles
                    .replace(/[\[\]"]/g, "")
                    .split(",")
                    .map(role => role.trim().toLowerCase())
                    .filter(Boolean);
            }
        }

        return [String(roles).trim().toLowerCase()];
    }

    function rolesContainSalesperson(roles) {
        return normaliseRoles(roles).includes("sales person");
    }

    function currentUserIsSalespersonOnly() {
        if (!window.pdiUserProfile && typeof pdiUserProfile === "undefined") return false;

        const profile =
            typeof pdiUserProfile !== "undefined"
                ? pdiUserProfile
                : window.pdiUserProfile;

        if (!profile || profile.is_admin === true) return false;

        const roles = normaliseRoles(profile.roles);
        return (
            roles.includes("sales person") &&
            !roles.includes("admin manager") &&
            !roles.includes("pdi admin") &&
            !roles.includes("pdi controller") &&
            !roles.includes("sales admin")
        );
    }

    function applySalespersonCaseScope() {
        if (!currentUserIsSalespersonOnly()) return false;
        if (typeof pdiCases === "undefined" || !Array.isArray(pdiCases)) return false;

        const userId =
            (typeof pdiUserProfile !== "undefined" ? pdiUserProfile?.user_id : null) ||
            window.pdiUserProfile?.user_id ||
            null;

        if (!userId) {
            console.warn("Salesperson dashboard filter: signed-in user ID is unavailable.");
            pdiCases = [];
            return true;
        }

        const beforeCount = pdiCases.length;
        pdiCases = pdiCases.filter(
            item => String(item.allocated_salesperson_id || "") === String(userId)
        );

        console.log(
            "Salesperson dashboard scope applied:",
            {
                userId,
                before: beforeCount,
                visible: pdiCases.length
            }
        );

        return true;
    }

    function installSalespersonDashboardScope() {
        if (typeof window.loadPdiCases !== "function") {
            console.warn("Salesperson dashboard filter: loadPdiCases is not available yet.");
            return;
        }

        if (window.loadPdiCases.__salespersonScoped) return;

        const originalLoadPdiCases = window.loadPdiCases;

        const scopedLoadPdiCases = async function (...args) {
            const result = await originalLoadPdiCases.apply(this, args);

            if (applySalespersonCaseScope()) {
                if (typeof window.renderPdiDashboard === "function") {
                    window.renderPdiDashboard();
                }
                if (typeof window.renderPdiVehicleTable === "function") {
                    window.renderPdiVehicleTable();
                }
                if (typeof window.renderPdiArchive === "function") {
                    window.renderPdiArchive();
                }
                if (typeof window.renderMyPdiActions === "function") {
                    await window.renderMyPdiActions();
                }
            }

            return result;
        };

        scopedLoadPdiCases.__salespersonScoped = true;
        window.loadPdiCases = scopedLoadPdiCases;

        try {
            loadPdiCases = scopedLoadPdiCases;
        } catch (error) {
            console.warn("Salesperson dashboard filter: global loadPdiCases binding could not be replaced.", error);
        }

        console.log("Salesperson dashboard scope installed.");
    }

    async function loadSalespeople() {
        const client = getSupabase();
        const select = $("preArrivalSalesperson");
        if (!client || !select) return;

        select.innerHTML = `<option value="">Unallocated / select salesperson...</option>`;

        try {
            const { data, error } = await client
                .from("user_profiles")
                .select("user_id, full_name, email, roles, is_active")
                .eq("is_active", true)
                .order("full_name", { ascending: true });

            if (error) throw error;

            const salespeople = (data || []).filter(
                profile => rolesContainSalesperson(profile.roles)
            );

            salespeople.forEach(profile => {
                const option = document.createElement("option");
                option.value = profile.user_id;
                option.dataset.name = profile.full_name || profile.email || "Salesperson";
                option.textContent = profile.full_name || profile.email || "Salesperson";
                select.appendChild(option);
            });

            console.log("Salespeople loaded:", salespeople.length);
        } catch (error) {
            console.error("Could not load salespeople:", error);
        }
    }

    function getSelectedSalesperson() {
        const select = $("preArrivalSalesperson");
        if (!select || !select.value) return { id: null, name: null };

        const option = select.options[select.selectedIndex];
        return {
            id: select.value,
            name: option?.dataset?.name || option?.textContent?.trim() || null
        };
    }

    function watchForSuccessfulOrder() {
        const message = $("preArrivalOrderMessage");
        if (!message) {
            console.warn("Pre-arrival extension: order message element not found.");
            return;
        }

        let processing = false;

        const observer = new MutationObserver(async () => {
            const text = (message.textContent || "").trim().toLowerCase();
            if (!text.includes("added successfully") || processing) return;

            const client = getSupabase();
            if (!client) return;

            processing = true;

            const stockNo = ($("preArrivalStockNo")?.value || "").trim();
            const salesperson = getSelectedSalesperson();

            try {
                console.log(
                    "Pre-arrival order created with allocation:",
                    {
                        stockNo: stockNo || null,
                        salesperson: salesperson?.name || null
                    }
                );

                if (typeof window.loadPdiCases === "function") {
                    await window.loadPdiCases();
                }

                if (typeof window.renderPdiDashboard === "function") {
                    window.renderPdiDashboard();
                }

                if ($("preArrivalStockNo")) $("preArrivalStockNo").value = "";
                if ($("preArrivalSalesperson")) $("preArrivalSalesperson").value = "";
            } catch (error) {
                console.error("Pre-arrival post-save refresh failed:", error);
                alert("The OEM order was created, but the dashboard could not refresh automatically. Please refresh the page.");
            } finally {
                processing = false;
            }
        });

        observer.observe(message, {
            childList: true,
            characterData: true,
            subtree: true
        });
    }

    async function initialisePreArrivalExtension() {
        console.log("PDI Pre-Arrival Extension loading...");

        addPreArrivalFields();
        installSalespersonDashboardScope();
        await loadSalespeople();
        watchForSuccessfulOrder();

        console.log("PDI Pre-Arrival Extension ready.");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialisePreArrivalExtension);
    } else {
        initialisePreArrivalExtension();
    }

})();
