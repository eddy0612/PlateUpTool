using UnityEngine;
using Kitchen;
using Kitchen.Modules;
using KitchenLib;
using System;
using System.Runtime.Serialization;
using System.Net;

namespace PlateUpTool_Integration
{

    public class PUT_Menu<T> : KLMenu<T>
    {
        // Toggle to enable/disable the Dump Data menu action
        public PUT_Menu(Transform container, ModuleList module_list) : base(container, module_list) { }
        internal PUT_Exporter myPUT_Exporter = new PUT_Exporter();

        internal static string ErrorMessage = null;
        public static PUT_Menu<T> _this = null;

        public override void Setup(int player_id)
        {
            PlateUpTool_Integration.TDbg("Setting up menu...");
            setupMenu();
        }

        public void setupMenu() {
            _this = this;
			ModuleList.Clear();

            if (ErrorMessage == null) {
                New<SpacerElement>();
                New<SpacerElement>();
                AddButton("Open design in PlateUpTool", delegate {
                    ExportToPUT(1);
                });
                if (!string.IsNullOrEmpty(Environment.GetEnvironmentVariable("ENABLE_DEBUG")))
                {
                    AddButton("Open design in PlateUpTool (localhost)", delegate {
                        ExportToPUT(2);
                    });
                    AddButton("Open design in PlateUpTool (dev)", delegate {
                        ExportToPUT(3);
                    });
                }
                AddButton("Import design from clipboard", delegate {
                    ImportFromPUT();
                });
                New<SpacerElement>();
                AddButton("Capture diagnostic data", delegate {
                    DumpData();
                });
            } else {
                New<SpacerElement>();
                New<SpacerElement>();
                AddInfo(ErrorMessage);
            }

            AddButton("Back", delegate {
                PUT_Menu<MenuAction>.ErrorMessage = null;
                RequestPreviousMenu();
            });
            ResetPanel();

            PlateUpTool_Integration.TDbg("Set up menu...");
        }

        public void showError(string message) {
            ErrorMessage = message;
            setupMenu();
            Redraw();
        }

        void ExportToPUT(int option)
        {
            PlateUpTool_Integration.TDbg("Exporting to PlateUpTool...");
            try
            {
                myPUT_Exporter.ExportDesign(option);
                PlateUpTool_Integration.TDbg("Exported to PlateUpTool successfully.");
            }
            catch (Exception ex)
            {
                PlateUpTool_Integration.TError("Failed to export to PlateUpTool: " + ex.Message);
            }
        }
        void ImportFromPUT()
        {
            PlateUpTool_Integration.TDbg("Importing from clipboard into PlateUpTool...");
            try
            {
                myPUT_Exporter.ImportDesign();
                PlateUpTool_Integration.TDbg("Queued up imported from clipboard into PlateUpTool successfully.");
            }
            catch (Exception ex)
            {
                PlateUpTool_Integration.TError("Failed to import into PlateUpTool: " + ex.Message);
            }
        }
        void DumpData()
        {
            PlateUpTool_Integration.TDbg("Dumping game data to log...");
            try
            {
                myPUT_Exporter.DumpDataDesign();
                PlateUpTool_Integration.TDbg("DumpData completed.");
            }
            catch (Exception ex)
            {
                PlateUpTool_Integration.TError("Failed to dump data: " + ex.Message);
            }
        }
    }
}