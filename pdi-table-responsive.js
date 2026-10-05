/* =========================================================
   ELT VEHICLE SUITE - PDI RESPONSIVE VEHICLE TABLE
   UI-only laptop optimisation for Vehicles In Progress.
========================================================= */
(function () {
    'use strict';

    const STYLE_ID = 'pdiResponsiveVehicleTableStyles';

    function install() {
        if (document.getElementById(STYLE_ID)) return;

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            /* Keep the active vehicle register inside its card */
            #activeVehicles,
            #activeVehicles .dashboard-collapse-body {
                min-width: 0 !important;
                max-width: 100% !important;
            }

            #activeVehicles .table-wrapper {
                width: 100% !important;
                max-width: 100% !important;
                overflow-x: auto !important;
                overflow-y: visible !important;
                -webkit-overflow-scrolling: touch;
                scrollbar-width: thin;
            }

            #activeVehicles .table-wrapper table {
                width: 100% !important;
                max-width: 100% !important;
                table-layout: fixed !important;
                border-collapse: collapse;
            }

            #activeVehicles .table-wrapper th,
            #activeVehicles .table-wrapper td {
                box-sizing: border-box;
                overflow-wrap: anywhere;
                word-break: normal;
                vertical-align: middle;
            }

            /* Laptop layout: compact all 12 columns without changing functionality */
            @media (max-width: 1600px) {
                #activeVehicles .filter-row {
                    gap: 12px !important;
                }

                #activeVehicles .table-wrapper table {
                    min-width: 1080px !important;
                    font-size: 12px !important;
                }

                #activeVehicles .table-wrapper th,
                #activeVehicles .table-wrapper td {
                    padding: 11px 7px !important;
                    line-height: 1.25 !important;
                }

                #activeVehicles .table-wrapper th:nth-child(1),
                #activeVehicles .table-wrapper td:nth-child(1) { width: 9%; }
                #activeVehicles .table-wrapper th:nth-child(2),
                #activeVehicles .table-wrapper td:nth-child(2) { width: 12%; }
                #activeVehicles .table-wrapper th:nth-child(3),
                #activeVehicles .table-wrapper td:nth-child(3) { width: 15%; }
                #activeVehicles .table-wrapper th:nth-child(4),
                #activeVehicles .table-wrapper td:nth-child(4) { width: 9%; }
                #activeVehicles .table-wrapper th:nth-child(5),
                #activeVehicles .table-wrapper td:nth-child(5) { width: 6%; }
                #activeVehicles .table-wrapper th:nth-child(6),
                #activeVehicles .table-wrapper td:nth-child(6) { width: 8%; }
                #activeVehicles .table-wrapper th:nth-child(7),
                #activeVehicles .table-wrapper td:nth-child(7) { width: 10%; }
                #activeVehicles .table-wrapper th:nth-child(8),
                #activeVehicles .table-wrapper td:nth-child(8) { width: 8%; }
                #activeVehicles .table-wrapper th:nth-child(9),
                #activeVehicles .table-wrapper td:nth-child(9) { width: 5%; }
                #activeVehicles .table-wrapper th:nth-child(10),
                #activeVehicles .table-wrapper td:nth-child(10) { width: 6%; }
                #activeVehicles .table-wrapper th:nth-child(11),
                #activeVehicles .table-wrapper td:nth-child(11) { width: 7%; }
                #activeVehicles .table-wrapper th:nth-child(12),
                #activeVehicles .table-wrapper td:nth-child(12) { width: 8%; }

                #activeVehicles .table-wrapper button {
                    max-width: 100%;
                    padding-left: 10px !important;
                    padding-right: 10px !important;
                    white-space: normal !important;
                }
            }

            /* On narrower laptops keep every column available via a local table scroll,
               rather than allowing the entire dashboard to run off-screen. */
            @media (max-width: 1250px) {
                #activeVehicles .table-wrapper table {
                    min-width: 1020px !important;
                    font-size: 11.5px !important;
                }

                #activeVehicles .table-wrapper th,
                #activeVehicles .table-wrapper td {
                    padding: 9px 6px !important;
                }
            }
        `;

        document.head.appendChild(style);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', install, { once: true });
    } else {
        install();
    }
})();
