using Kitchen;
using KitchenLib;
using KitchenLib.Event;
using System.Reflection;
namespace PlateUpTool_Integration
{
    public class PlateUpTool_Integration : BaseMod
    {
        // ========= Constants ===========
        public const string MOD_ID = "com.eddy0612.plateuptool";
        public const string MOD_NAME = "PlateUpTool";
        public const string MOD_VERSION = "0.0.2";

        // ========= Class wide variables ===========
        internal static KitchenLib.Logging.KitchenLogger Logger;

        // ========= Constructors ===========
        /* When object is created, register with the KitchenLib Mod Manager */
        public PlateUpTool_Integration() : base(MOD_ID, MOD_NAME, "eddy0612", MOD_VERSION, "", ">=1.4.3", Assembly.GetExecutingAssembly()) { }

        // ========= Diagnostic Routines ===========
        public static void TDbg(string msg) {
            Logger.LogInfo("plateuptool_integration [I] : " + msg);
        }

        public static void TWarn(string msg) {
            Logger.LogWarning("plateuptool_integration [W] : " + msg);
        }

        public static void TError(string msg) {
            Logger.LogError("plateuptool_integration [W] : " + msg);
        }

        // ========= Initial MOD load function which does main setup ===========
        protected override void OnPostActivate(KitchenMods.Mod mod)
        {
            Logger = InitLogger();
            TDbg("Initialize start");

            /*
            // Using the PreferenceSystem mod to add a button to the mod's settings menu.
            PrefManager = new PreferenceSystemManager("com.eddy0612.plateuptool_integration", "plateuptool_integration");
            PrefManager.AddLabel("Excport to PlateUpTool").AddButton("Open Menu", (Action<int>)delegate
            {
                TDbg("Menu Clicked");
            }, 0, 1f, 0.2f);
            PrefManager.RegisterMenu((MenuType)1);
            */
            initPauseMenu();

            TDbg("Initialized");
        }

        // ========= Setup the Menu item ===========
        private void initPauseMenu()
        {
            ModsPreferencesMenu<MenuAction>.RegisterMenu(MOD_NAME, typeof(PUT_Menu<MenuAction>), typeof(MenuAction));
            Events.PlayerPauseView_SetupMenusEvent += (s, args) => {
                args.addMenu.Invoke(args.instance, new object[] { typeof(PUT_Menu<MenuAction>), new PUT_Menu<MenuAction>(args.instance.ButtonContainer, args.module_list) });
            };
        }

    }
}
