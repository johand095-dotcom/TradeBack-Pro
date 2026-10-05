/* =========================================================
   PDI DASHBOARD RENDERER FIX
   Restores renderPdiDashboard after the function declaration
   was accidentally removed during allocation changes.
========================================================= */

(function () {
    "use strict";

    function setMetric(id, value) {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    }

    window.renderPdiDashboard = function renderPdiDashboard() {
        const cases =
            (typeof pdiCases !== "undefined" && Array.isArray(pdiCases))
                ? pdiCases
                : [];

        const activeCases = cases.filter(
            item => item.workflow_status !== "Completed"
        );

        const awaitingPdi = activeCases.filter(
            item => Number(item.current_step) >= 20 && Number(item.current_step) <= 22
        );

        const awaitingPaint = activeCases.filter(
            item => Number(item.current_step) >= 29 && Number(item.current_step) <= 31
        );

        const salesSignoff = activeCases.filter(
            item => Number(item.current_step) >= 33 && Number(item.current_step) <= 37
        );

        const readyCollection = activeCases.filter(
            item => Number(item.current_step) >= 38
        );

        setMetric("metricInProgress", activeCases.length);
        setMetric("metricAwaitingPdi", awaitingPdi.length);
        setMetric("metricAwaitingPaint", awaitingPaint.length);
        setMetric("metricSalesSignoff", salesSignoff.length);
        setMetric("metricReadyCollection", readyCollection.length);

        const highPriorityCount = activeCases.filter(
            item => item.stock_classification === "Sold"
        ).length;

        const mediumPriorityCount = activeCases.filter(
            item => item.stock_classification === "Allocated"
        ).length;

        const lowPriorityCount = activeCases.filter(
            item => (item.stock_classification || "Stock") === "Stock"
        ).length;

        setMetric("metricPriorityHigh", highPriorityCount);
        setMetric("metricPriorityMedium", mediumPriorityCount);
        setMetric("metricPriorityLow", lowPriorityCount);

        if (typeof window.renderAwaitingArrivalTable === "function") {
            window.renderAwaitingArrivalTable();
        }
    };

    try {
        renderPdiDashboard = window.renderPdiDashboard;
    } catch (error) {
        console.warn("PDI dashboard renderer global binding could not be assigned.", error);
    }

    console.log("PDI dashboard renderer restored.");
})();
