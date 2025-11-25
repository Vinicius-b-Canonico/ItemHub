// =============================================================
//  Modais de Erro e Sucesso – ItemHub (Visual Premium)
// =============================================================

let resultModalsInjected = false;
let errorModalInstance = null;
let successModalInstance = null;

function injectResultModalsIfNeeded() {
  if (resultModalsInjected) return;

  const container = document.getElementById("resultModalsContainer");
  if (!container) {
    console.error("resultModalsContainer não encontrado na página.");
    return;
  }

  container.innerHTML = `
    <!-- Erro -->
    <div class="modal fade" id="errorResultModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content shadow-lg border-0 overflow-hidden">
          <div class="modal-header bg-danger text-white">
            <h5 class="modal-title fw-bold d-flex align-items-center gap-3">
              <i class="bi bi-exclamation-triangle-fill fs-4"></i>
              <span id="errorResultTitle">Erro</span>
            </h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Fechar"></button>
          </div>
          <div class="modal-body py-4">
            <div id="errorResultMessage" class="text-dark fs-5 text-center px-3"></div>
            <a id="errorResultActionBtn" href="#" class="btn btn-outline-danger mt-4 d-none px-5">
              Tentar Novamente
            </a>
          </div>
          <div class="modal-footer justify-content-center border-0 pt-0">
            <button type="button" class="btn btn-secondary px-5" data-bs-dismiss="modal">
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Sucesso -->
    <div class="modal fade" id="successResultModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content shadow-lg border-0 overflow-hidden">
          <div class="modal-header bg-success text-white">
            <h5 class="modal-title fw-bold d-flex align-items-center gap-3">
              <i class="bi bi-check-circle-fill fs-4"></i>
              <span id="successResultTitle">Sucesso!</span>
            </h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Fechar"></button>
          </div>
          <div class="modal-body py-5 text-center">
            <i class="bi bi-check-circle text-success fs-1 mb-4"></i>
            <div id="successResultMessage" class="fs-5 text-dark px-3"></div>
            <a id="successResultActionBtn" href="#" class="btn btn-success mt-4 px-5 d-none">
              Continuar
            </a>
          </div>
          <div class="modal-footer justify-content-center border-0 pt-0">
            <button type="button" class="btn btn-outline-success px-5" data-bs-dismiss="modal">
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  resultModalsInjected = true;
}

export function initializeResultModals() {
  injectResultModalsIfNeeded();

  errorModalInstance = new bootstrap.Modal(document.getElementById("errorResultModal"));
  successModalInstance = new bootstrap.Modal(document.getElementById("successResultModal"));
}

// Erro
export function showErrorModal({
  title = "Erro",
  message = "Ocorreu um erro inesperado.",
  actionText = null,
  actionHref = null
} = {}) {
  initializeResultModals();

  document.getElementById("errorResultTitle").textContent = title;
  document.getElementById("errorResultMessage").innerHTML = message;

  const btn = document.getElementById("errorResultActionBtn");
  if (actionText && actionHref) {
    btn.textContent = actionText;
    btn.href = actionHref;
    btn.classList.remove("d-none");
  } else {
    btn.classList.add("d-none");
  }

  errorModalInstance.show();
}

// Sucesso
export function showSuccessModal({
  title = "Sucesso!",
  message = "Operação realizada com sucesso.",
  actionText = null,
  actionHref = null
} = {}) {
  initializeResultModals();

  document.getElementById("successResultTitle").textContent = title;
  document.getElementById("successResultMessage").innerHTML = message;

  const btn = document.getElementById("successResultActionBtn");
  if (actionText && actionHref) {
    btn.textContent = actionText;
    btn.href = actionHref;
    btn.classList.remove("d-none");
  } else {
    btn.classList.add("d-none");
  }

  successModalInstance.show();
}