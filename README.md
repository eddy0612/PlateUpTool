
# [PlateUp Tool](https://eddy0612.github.io/PlateUpTool/)

PlateUp Tool is a free, open-source web application for planning and designing restaurant layouts for the game PlateUp! It allows you to drag and drop appliances, experiment with different kitchen setups, and share your layouts instantly via URL or as pictures. No account or installation required.

## Features
- **Visual Restaurant Planner**: Drag and drop appliances to design your PlateUp! restaurant layout.
- **Share Designs Instantly**: Share your layouts via URL or export as images to share anywhere.
- **Blueprints**: Save your designs as blueprints and reuse them in future layouts.
- **Multi-Select & Editing**: Select, move, rotate, cut, copy, and paste groups of appliances at once.
- **Tab Support**: Organize and isolate different parts of your restaurant using tabs.
- **Inventory & Preview**: See a summary of your placed appliances and preview your design.
- **Tutorial & Examples**: Built-in tutorial and example layouts to help you get started.
- **No Account Needed**: Use instantly, no login required.

## Getting Started

### Online
Visit the [PlateUp Tool online](https://eddy0612.github.io/PlateUpTool/) to use the planner instantly in your browser.

### Local Development
1. **Clone the repository**
2. **Install dependencies and run locally**
	 - Use the provided batch script:
		 ```
		 run-src.bat
		 ```
	 - Or run manually:
		 ```
		 cd src
		 npm install
		 npm run dev
		 ```
3. Open your browser to [http://localhost:5173](http://localhost:5173)

## Project Structure
- `src/` — Main application (Vue 3, Vite)
	- `components/` — Vue components
	- `composables/` — Vue composables (logic)
	- `public/res/` — Appliance assets (JSON, 2D, 3D)
	- `store/` — State management
- `BuildTools/` — Scripts for asset management
- `ai/` — AI instructions and UI reference notes
- `Examples/` — Example layouts and screenshots

## Scripts
- `run-src.bat` — Installs dependencies and starts the dev server (Windows)
- `npm run dev` — Start development server
- `npm run build` — Build for production
- `npm run preview` — Preview production build

## Credits
- PlateUp! development team for the game and asset permissions
- [plateupplanner.github.io](https://plateupplanner.github.io/) for inspiration
- [GitHub Copilot](https://github.com/features/copilot) for coding assistance
- Community testers and contributors


## License
This project is licensed under the [MIT License](./LICENSE). You are free to use, modify, and distribute the code as long as credit is given and the license notice is included.

This project is not affiliated with or endorsed by PlateUp! or its developers. All PlateUp! assets used with permission. See CREDITS.md for details.

---

For feedback, bug reports, or suggestions, please [open an issue](https://github.com/eddy0612/PlateUpTool/issues).