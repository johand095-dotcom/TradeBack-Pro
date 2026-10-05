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

    /* =====================================================
       ADD NEW PRE-ARRIVAL FIELDS
    ===================================================== */

    function addPreArrivalFields() {

        if (
            $("preArrivalStockNo") ||
            $("preArrivalSalesperson")
        ) {
            return;
        }

        const anchor =
            $("preArrivalSupplier") ||
            $("preArrivalMake") ||
            $("preArrivalModel");

        if (!anchor) {
            console.warn(
                "Pre-arrival extension: form anchor not found."
            );
            return;
        }

        const wrapper =
            anchor.closest(
                ".prearrival-field, .form-field, div"
            );

        if (
            !wrapper ||
            !wrapper.parentElement
        ) {
            return;
        }

        const host =
            document.createElement("div");

        host.id =
            "preArrivalExtensionFields";

        host.style.display =
            "contents";

        host.innerHTML = `

            <div class="prearrival-field">

                <label for="preArrivalStockNo">
                    Stock Number
                </label>

                <input
                    type="text"
                    id="preArrivalStockNo"
                    placeholder="Enter ELT stock number"
                    autocomplete="off"
                >

            </div>


            <div class="prearrival-field">

                <label for="preArrivalSalesperson">
                    Allocated Salesperson
                </label>

                <select id="preArrivalSalesperson">

                    <option value="">
                        Unallocated / select salesperson...
                    </option>

                </select>

            </div>
        `;

        wrapper.parentElement.insertBefore(
            host,
            wrapper.nextSibling
        );
    }


    /* =====================================================
       IDENTIFY SALES USERS
    ===================================================== */

    function rolesContainSalesperson(roles) {

    if (!roles) {
        return false;
    }

    if (Array.isArray(roles)) {

        return roles.some(
            role =>
                String(role)
                    .trim()
                    .toLowerCase() ===
                "sales person"
        );
    }

    if (typeof roles === "string") {

        try {

            const parsed =
                JSON.parse(roles);

            if (Array.isArray(parsed)) {

                return parsed.some(
                    role =>
                        String(role)
                            .trim()
                            .toLowerCase() ===
                        "sales person"
                );
            }

        } catch (error) {

            return roles
                .replace(/[\[\]"]/g, "")
                .split(",")
                .some(
                    role =>
                        role
                            .trim()
                            .toLowerCase() ===
                        "sales person"
                );
        }
    }

    return false;
}


    /* =====================================================
       LOAD ACTIVE SALESPEOPLE
    ===================================================== */

    async function loadSalespeople() {

        const client =
            getSupabase();

        const select =
            $("preArrivalSalesperson");

        if (
            !client ||
            !select
        ) {
            return;
        }

        select.innerHTML = `
            <option value="">
                Unallocated / select salesperson...
            </option>
        `;

        try {

            const {
                data,
                error
            } =
                await client
                    .from("user_profiles")
                    .select(
                        "user_id, full_name, email, roles, is_active"
                    )
                    .eq(
                        "is_active",
                        true
                    )
                    .order(
                        "full_name",
                        {
                            ascending: true
                        }
                    );

            if (error) {
                throw error;
            }

            const salespeople =
                (data || [])
                    .filter(
                        profile =>
                            rolesContainSalesperson(
                                profile.roles
                            )
                    );

            salespeople.forEach(
                profile => {

                    const option =
                        document.createElement(
                            "option"
                        );

                    option.value =
                        profile.user_id;

                    option.dataset.name =
                        profile.full_name ||
                        profile.email ||
                        "Salesperson";

                    option.textContent =
                        profile.full_name ||
                        profile.email ||
                        "Salesperson";

                    select.appendChild(
                        option
                    );
                }
            );

            console.log(
                "Salespeople loaded:",
                salespeople.length
            );

        } catch (error) {

            console.error(
                "Could not load salespeople:",
                error
            );
        }
    }


    function getSelectedSalesperson() {

        const select =
            $("preArrivalSalesperson");

        if (
            !select ||
            !select.value
        ) {

            return {
                id: null,
                name: null
            };
        }

        const option =
            select.options[
                select.selectedIndex
            ];

        return {

            id:
                select.value,

            name:
                option?.dataset?.name ||
                option?.textContent?.trim() ||
                null
        };
    }
        /* =====================================================
       LINK EXTRA DATA TO NEW PDI ORDER
    ===================================================== */

    function watchForSuccessfulOrder() {

        const message =
            $("preArrivalOrderMessage");

        if (!message) {

            console.warn(
                "Pre-arrival extension: order message element not found."
            );

            return;
        }

        let processing = false;

        const observer =
            new MutationObserver(
                async () => {

                    const text =
                        (
                            message.textContent ||
                            ""
                        )
                            .trim()
                            .toLowerCase();

                    if (
                        !text.includes(
                            "added successfully"
                        ) ||
                        processing
                    ) {
                        return;
                    }

                    const client =
                        getSupabase();

                    if (!client) {
                        return;
                    }

                    processing = true;

                    const stockNo =
                        (
                            $("preArrivalStockNo")
                                ?.value ||
                            ""
                        ).trim();

                    const salesperson =
                        getSelectedSalesperson();

                    try {

                      /*
    Stock number and allocated salesperson are now written
    directly to pdi_cases by pdi.js when the OEM order is created.

    The old "find newest Awaiting Arrival record and enrich it"
    process has therefore been removed.

    This avoids the risk of updating the wrong vehicle when
    multiple users create OEM orders at similar times.
*/

console.log(
    "Pre-arrival order created with allocation:",
    {
        stockNo: stockNo || null,
        salesperson:
            salesperson?.name || null
    }
);


                        /*
                           Refresh PDI data so Waiting Orders
                           immediately shows the updated record.
                        */

                        if (
                            typeof window
                                .loadPdiCases ===
                            "function"
                        ) {

                            await window
                                .loadPdiCases();
                        }

                        if (
                            typeof window
                                .renderPdiDashboard ===
                            "function"
                        ) {

                            window
                                .renderPdiDashboard();
                        }


                        /*
                           Clear extension fields ready
                           for the next OEM order.
                        */

                        if (
                            $("preArrivalStockNo")
                        ) {

                            $("preArrivalStockNo")
                                .value = "";
                        }

                        if (
                            $("preArrivalSalesperson")
                        ) {

                            $("preArrivalSalesperson")
                                .value = "";
                        }

                    } catch (error) {

                  console.error(
    "Pre-arrival post-save refresh failed:",
    error
);

alert(
    "The OEM order was created, but the dashboard could not refresh automatically. Please refresh the page."
);

                    } finally {

                        processing =
                            false;
                    }
                }
            );

        observer.observe(
            message,
            {
                childList: true,
                characterData: true,
                subtree: true
            }
        );
    }


    /* =====================================================
       INITIALISE EXTENSION
    ===================================================== */

    async function initialisePreArrivalExtension() {

        console.log(
            "PDI Pre-Arrival Extension loading..."
        );

        addPreArrivalFields();

        await loadSalespeople();

        watchForSuccessfulOrder();

        console.log(
            "PDI Pre-Arrival Extension ready."
        );
    }


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initialisePreArrivalExtension
        );

    } else {

        initialisePreArrivalExtension();
    }

})();