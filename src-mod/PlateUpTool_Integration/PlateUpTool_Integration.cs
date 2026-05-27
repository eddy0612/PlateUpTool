using Kitchen;
using KitchenLib;
using KitchenLib.Event;
using System;
using System.Reflection;
using UnityEngine;
using Kitchen.Modules;
using System.Runtime.Serialization;
namespace PlateUpTool_Integration
{
    public class PlateUpTool_Integration : BaseMod
    {
        // ========= Constants ===========
        public const string MOD_ID = "com.eddy0612.plateuptool_integration";
        public const string MOD_NAME = "plateuptool_integration";
        public const string MOD_VERSION = "0.0.1";

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

/*
            Events.PlayerPauseView_SetupMenusEvent = (EventHandler<PlayerPauseView_SetupMenusArgs>)Delegate.Combine(
                Events.PlayerPauseView_SetupMenusEvent, 
                (EventHandler<PlayerPauseView_SetupMenusArgs>)delegate (object s, PlayerPauseView_SetupMenusArgs args)
                  {
                      args.addActionButton("Open design in PlateUpTool", delegate {
                          ExportToPUT();
                      });
                  }                  
            );


            Events.MainMenu_SetupEvent = (EventHandler<MainMenu_SetupArgs>)Delegate.Combine(
                Events.MainMenu_SetupEvent, 
                (EventHandler<MainMenu_SetupArgs>)delegate (object s, MainMenu_SetupArgs args)
                  {
                      // Get the MenuAction type from the method parameters
                      var methodParams = args.addActionButton.GetParameters();
                      var menuActionType = methodParams[1].ParameterType;

                      // Create a delegate that matches the signature
                      var delegateMethod = new Action<int>((int player_id) => {
                          TDbg("PlateUpTool menu item clicked!");
                      });

                      // Create MenuAction without calling constructor (for structs/classes with no constructor)
                      var buttonAction = FormatterServices.GetUninitializedObject(menuActionType);

                      // Try to set the Action field or property
                      var actionField = menuActionType.GetField("Action");
                      if (actionField != null)
                      {
                          actionField.SetValue(buttonAction, delegateMethod);
                      }
                      else
                      {
                          // Try as property
                          var actionProperty = menuActionType.GetProperty("Action");
                          if (actionProperty != null)
                          {
                              actionProperty.SetValue(buttonAction, delegateMethod, null);
                          }
                      }

                      args.addActionButton.Invoke(args.instance, new object[] { 
                          "Open design in PlateUpTool", 
                          buttonAction,
                          0  // player_id parameter
                      });
                  }                  
            );
*/
        }

    }
}
