// js/pages/marketplacePage.js
import { initState, loadInitialUserData } from "./marketplace/state.js";
import { initFilters } from "./marketplace/filters.js";
import { resetAndLoadItems } from "./marketplace/render.js";
import { loadNavbar } from "../components/navbar.js";
import { initItemCardClicks } from "./marketplace/events.js";

document.addEventListener("DOMContentLoaded", async () => {
  await loadNavbar();

  await initState();
  await loadInitialUserData();

  initFilters();
  initItemCardClicks();

  resetAndLoadItems();
});
