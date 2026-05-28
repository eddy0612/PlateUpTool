using UnityEngine;
using Kitchen.Modules;
using KitchenLib;
using System;

namespace PlateUpTool_Integration
{

    public class PUT_Menu<T> : KLMenu<T>
    {
        public PUT_Menu(Transform container, ModuleList module_list) : base(container, module_list) { }
        internal PUT_Exporter myPUT_Exporter = new PUT_Exporter();

        public override void Setup(int player_id)
        {
            PlateUpTool_Integration.TDbg("Setting up menu...");

            New<SpacerElement>();
            New<SpacerElement>();
            AddButton("Open design in PlateUpTool", delegate {
                ExportToPUT();
            });
            AddButton("Import design from clipboard", delegate {
                ImportFromPUT();
            });
            AddButton("Back", delegate {
                RequestPreviousMenu();
            });

            PlateUpTool_Integration.TDbg("Set up menu...");
        }

        void ExportToPUT()
        {
            PlateUpTool_Integration.TDbg("Exporting to PlateUpTool...");
            try
            {
                myPUT_Exporter.ExportDesign();
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
                PlateUpTool_Integration.TDbg("Imported from clipboard into PlateUpTool successfully.");
            }
            catch (Exception ex)
            {
                PlateUpTool_Integration.TError("Failed to import into PlateUpTool: " + ex.Message);
            }
        }
    }
}