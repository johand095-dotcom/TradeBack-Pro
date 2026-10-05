/* =========================================================
   ELT VEHICLE SUITE - PDI RESPONSIVE VEHICLE TABLE
   Clean operational register for laptop and auxiliary screens.
   Visible columns:
   Vehicle | VIN | Classification | Priority | Current Step |
   Responsible | Age | SLA | Status | Actions
========================================================= */
(function () {
    'use strict';

    const STYLE_ID = 'pdiResponsiveVehicleTableStyles';

    function simplifyTable() {
        const section = document.getElementById('activeVehicles');
        const table = section?.querySelector('.table-wrapper table');
        if (!table) return;

        const headerRow = table.querySelector('thead tr');
        if (headerRow && headerRow.cells.length >= 12) {
            // Original header: Stock, Vehicle, VIN, Classification, Priority,
            // Current Stage, Current Step, Responsible, Age, SLA, Status, Actions.
            headerRow.cells[0].style.display = 'none'; // Stock No.
            headerRow.cells[5].style.display = 'none'; // Current Stage
        }

        table.querySelectorAll('#pdiVehicleTableBody tr').forEach(row => {
            if (row.classList.contains('pdi-responsive-processed')) return;

            const cells = row.cells;

            // Normal rendered rows currently contain an extra duplicated phase/stage cell.
            // Hide Stock No. plus both phase/stage cells so Current Step aligns correctly.
            if (cells.length >= 13) {
                cells[0].style.display = 'none';
                cells[5].style.display = 'none';
                cells[6].style.display = 'none';
                row.classList.add('pdi-responsive-processed');
                return;
            }

            // Fallback if the underlying renderer is later corrected to 12 cells.
            if (cells.length === 12) {
                cells[0].style.display = 'none';
                cells[5].style.display = 'none';
                row.classList.add('pdi-responsive-processed');
            }
        });
    }

    function install() {
        if (!document.getElementById(STYLE_ID)) {
            const style = document.createElement('style');
            style.id = STYLE_ID;
            style.textContent = `
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
                    min-width: 0 !important;
                    table-layout: fixed !important;
                    border-collapse: collapse;
                }

                #activeVehicles .table-wrapper th,
                #activeVehicles .table-wrapper td {
                    box-sizing: border-box;
                    vertical-align: middle;
                    overflow-wrap: normal;
                    word-break: normal;
                    hyphens: none;
                }

                /* Ten-column operational layout after Stock No. and Current Stage are hidden. */
                #activeVehicles .table-wrapper th:nth-child(2),
                #activeVehicles .table-wrapper td:nth-child(2) { width: 11%; }

                #activeVehicles .table-wrapper th:nth-child(3),
                #activeVehicles .table-wrapper td:nth-child(3) { width: 15%; }

                #activeVehicles .table-wrapper th:nth-child(4),
                #activeVehicles .table-wrapper td:nth-child(4) { width: 10%; }

                #activeVehicles .table-wrapper th:nth-child(5),
                #activeVehicles .table-wrapper td:nth-child(5) { width: 7%; }

                /* Header Current Step is nth-child(7); rendered row step is nth-child(8)
                   because the legacy renderer currently outputs a duplicate stage cell. */
                #activeVehicles .table-wrapper th:nth-child(7) { width: 17%; }
                #activeVehicles .table-wrapper td:nth-child(8) { width: 17%; }

                #activeVehicles .table-wrapper th:nth-child(8) { width: 10%; }
                #activeVehicles .table-wrapper td:nth-child(9) { width: 10%; }

                #activeVehicles .table-wrapper th:nth-child(9) { width: 6%; }
                #activeVehicles .table-wrapper td:nth-child(10) { width: 6%; }

                #activeVehicles .table-wrapper th:nth-child(10) { width: 8%; }
                #activeVehicles .table-wrapper td:nth-child(11) { width: 8%; }

                #activeVehicles .table-wrapper th:nth-child(11) { width: 8%; }
                #activeVehicles .table-wrapper td:nth-child(12) { width: 8%; }

                #activeVehicles .table-wrapper th:nth-child(12) { width: 8%; }
                #activeVehicles .table-wrapper td:nth-child(13) { width: 8%; }

                #activeVehicles .table-wrapper button {
                    max-width: 100%;
                    white-space: normal !important;
                }

                @media (max-width: 1600px) {
                    #activeVehicles .filter-row { gap: 12px !important; }

                    #activeVehicles .table-wrapper table {
                        font-size: 12px !important;
                    }

                    #activeVehicles .table-wrapper th,
                    #activeVehicles .table-wrapper td {
                        padding: 10px 7px !important;
                        line-height: 1.25 !important;
                    }

                    #activeVehicles .table-wrapper th {
                        white-space: normal !important;
                        overflow-wrap: normal !important;
                        word-break: keep-all !important;
                    }
                }

                @media (max-width: 1250px) {
                    #activeVehicles .table-wrapper table {
                        font-size: 11.5px !important;
                    }

                    #activeVehicles .table-wrapper th,
                    #activeVehicles .table-wrapper td {
                        padding: 9px 5px !important;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        simplifyTable();

        const body = document.getElementById('pdiVehicleTableBody');
        if (body && !body.dataset.responsiveObserverInstalled) {
            body.dataset.responsiveObserverInstalled = '1';
            new MutationObserver(() => simplifyTable()).observe(body, {
                childList: true,
                subtree: true
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', install, { once: true });
    } else {
        install();
    }
})();
