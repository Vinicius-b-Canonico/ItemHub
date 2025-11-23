// =============================================================
//  Reusable Error & Success Result Modals Component
// =============================================================

let resultModalsInjected = false;
let errorModalInstance = null;
let successModalInstance = null;

// -------------------------------------------------------------
// Inject modal HTML into the page once
// -------------------------------------------------------------
function injectResultModalsIfNeeded() {
  //if (resultModalsInjected) return;

  const container = document.getElementById("resultModalsContainer");
  if (!container) {
    console.error("resultModalsContainer missing in this page.");
    return;
  }

  container.innerHTML = `
    <!-- ========================================================= -->
    <!-- ❌ ERROR MODAL -->
    <!-- ========================================================= -->
    <div class="modal fade" id="errorResultModal" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content border-danger shadow">

          <div class="modal-header bg-danger text-white">
            <h5 class="modal-title d-flex align-items-center gap-2">
              <i class="bi bi-exclamation-triangle-fill"></i>
              <span id="errorResultTitle">Error</span>
            </h5>
            <button type="button" class="btn-close btn-close-white"
                    data-bs-dismiss="modal"></button>
          </div>

          <div class="modal-body">
            <div id="errorResultMessage" class="mb-3 text-dark"></div>

            <!-- Action Button (optional) -->
            <a id="errorResultActionBtn"
               href="#"
               class="btn btn-primary d-none">
            </a>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary"
                    data-bs-dismiss="modal">Close</button>
          </div>

        </div>
      </div>
    </div>


    <!-- ========================================================= -->
    <!-- ✅ SUCCESS MODAL (placeholder for now) -->
    <!-- ========================================================= -->
    <div class="modal fade" id="successResultModal" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content border-success shadow">

          <div class="modal-header bg-success text-white">
            <h5 class="modal-title d-flex align-items-center gap-2">
              <i class="bi bi-check-circle-fill"></i>
              <span id="successResultTitle">Success</span>
            </h5>
            <button type="button" class="btn-close btn-close-white"
                    data-bs-dismiss="modal"></button>
          </div>

          <div class="modal-body">
            <div id="successResultMessage" class="mb-3 text-dark"></div>

            <!-- Placeholder CTA -->
            <a id="successResultActionBtn"
               href="#"
               class="btn btn-primary d-none">
            </a>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary"
                    data-bs-dismiss="modal">Close</button>
          </div>

        </div>
      </div>
    </div>
  `;

  resultModalsInjected = true;
}

// -------------------------------------------------------------
// Initialize Bootstrap modal instances
// -------------------------------------------------------------
export function initializeResultModals() {
  injectResultModalsIfNeeded();

  errorModalInstance = bootstrap.Modal.getOrCreateInstance(
    document.getElementById("errorResultModal")
  );

  successModalInstance = bootstrap.Modal.getOrCreateInstance(
    document.getElementById("successResultModal")
  );
}

// =============================================================
//  ❌ SHOW ERROR MODAL
// =============================================================
export function showErrorModal({
  title = "Error",
  message = "An unexpected error occurred.",
  actionText = null,
  actionHref = null
} = {}) {
  initializeResultModals();

  const titleEl   = document.getElementById("errorResultTitle");
  const msgEl     = document.getElementById("errorResultMessage");
  const actionBtn = document.getElementById("errorResultActionBtn");

  titleEl.textContent = title;
  msgEl.innerHTML = message;

  // Handle CTA button
  if (actionText && actionHref) {
    actionBtn.textContent = actionText;
    actionBtn.href = actionHref;
    actionBtn.classList.remove("d-none");
  } else {
    actionBtn.classList.add("d-none");
    actionBtn.href = "#";
    actionBtn.textContent = "";
  }

  errorModalInstance.show();
}

// =============================================================
//  ✅ SHOW SUCCESS MODAL (placeholder implementation)
// =============================================================
export function showSuccessModal({
  title = "Success",
  message = "Operation completed successfully.",
  actionText = null,
  actionHref = null
} = {}) {
  initializeResultModals();

  const titleEl   = document.getElementById("successResultTitle");
  const msgEl     = document.getElementById("successResultMessage");
  const actionBtn = document.getElementById("successResultActionBtn");

  titleEl.textContent = title;
  msgEl.innerHTML = message;

  if (actionText && actionHref) {
    actionBtn.textContent = actionText;
    actionBtn.href = actionHref;
    actionBtn.classList.remove("d-none");
  } else {
    actionBtn.classList.add("d-none");
  }

  successModalInstance.show();
}
