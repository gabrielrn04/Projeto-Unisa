const STORAGE_KEY = "agenda-simples-v1";

const form = document.getElementById("appointmentForm");
const appointmentId = document.getElementById("appointmentId");
const clientInput = document.getElementById("client");
const serviceInput = document.getElementById("service");
const dateInput = document.getElementById("date");
const timeInput = document.getElementById("time");
const statusInput = document.getElementById("status");
const contactInput = document.getElementById("contact");
const notesInput = document.getElementById("notes");
const resetButton = document.getElementById("resetButton");
const submitButton = document.getElementById("submitButton");
const appointmentsContainer = document.getElementById("appointments");
const searchInput = document.getElementById("searchInput");
const filterButtons = document.querySelectorAll("[data-filter]");

const totalCount = document.getElementById("totalCount");
const pendingCount = document.getElementById("pendingCount");
const doneCount = document.getElementById("doneCount");

let appointments = loadAppointments();
let activeFilter = "all";

form.addEventListener("submit", handleSubmit);
resetButton.addEventListener("click", resetForm);
searchInput.addEventListener("input", renderAppointments);
filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    filterButtons.forEach((item) => item.classList.toggle("active", item === button));
    renderAppointments();
  });
});

renderAppointments();
updateStats();

function handleSubmit(event) {
  event.preventDefault();

  const payload = {
    id: appointmentId.value || crypto.randomUUID(),
    client: clientInput.value.trim(),
    service: serviceInput.value.trim(),
    date: dateInput.value,
    time: timeInput.value,
    status: statusInput.value,
    contact: contactInput.value.trim(),
    notes: notesInput.value.trim()
  };

  const existingIndex = appointments.findIndex((item) => item.id === payload.id);

  if (existingIndex >= 0) {
    appointments[existingIndex] = payload;
  } else {
    appointments.push(payload);
  }

  sortAppointments();
  persistAppointments();
  resetForm();
  renderAppointments();
  updateStats();
}

function resetForm() {
  form.reset();
  appointmentId.value = "";
  submitButton.textContent = "Salvar agendamento";
  statusInput.value = "pending";
}

function loadAppointments() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return seedAppointments();
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : seedAppointments();
  } catch {
    return seedAppointments();
  }
}

function persistAppointments() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appointments));
}

function seedAppointments() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const initial = [
    {
      id: crypto.randomUUID(),
      client: "Mariana Costa",
      service: "Reunião de alinhamento",
      date: formatDate(today),
      time: "09:30",
      status: "pending",
      contact: "(11) 99999-0001",
      notes: "Definir próximos passos do projeto"
    },
    {
      id: crypto.randomUUID(),
      client: "Carlos Mendes",
      service: "Visita técnica",
      date: formatDate(tomorrow),
      time: "14:00",
      status: "done",
      contact: "carlos@email.com",
      notes: "Levar checklist de instalação"
    }
  ];

  localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  return initial;
}

function renderAppointments() {
  const query = searchInput.value.trim().toLowerCase();

  const filtered = appointments.filter((item) => {
    const matchesFilter = activeFilter === "all" || item.status === activeFilter;
    const matchesQuery =
      !query ||
      item.client.toLowerCase().includes(query) ||
      item.service.toLowerCase().includes(query) ||
      item.contact.toLowerCase().includes(query);

    return matchesFilter && matchesQuery;
  });

  if (!filtered.length) {
    appointmentsContainer.innerHTML = `
      <div class="empty-state">
        <strong>Nenhum agendamento encontrado.</strong>
        <p>Cadastre um novo compromisso ou ajuste sua busca.</p>
      </div>
    `;
    return;
  }

  appointmentsContainer.innerHTML = filtered.map((item) => {
    const formattedDate = new Date(item.date + "T00:00:00").toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    });

    return `
      <article class="appointment">
        <div class="appointment-header">
          <div>
            <h3>${escapeHtml(item.client)}</h3>
            <p>${escapeHtml(item.service)}</p>
          </div>
          <span class="tag ${item.status}">
            ${item.status === "done" ? "Concluído" : "Pendente"}
          </span>
        </div>

        <div class="meta">
          <span class="tag">${formattedDate}</span>
          <span class="tag">${escapeHtml(item.time)}</span>
          ${item.contact ? `<span class="tag">${escapeHtml(item.contact)}</span>` : ""}
        </div>

        <p>${item.notes ? escapeHtml(item.notes) : "Sem observações cadastradas."}</p>

        <div class="appointment-footer">
          <span class="small">ID: ${escapeHtml(item.id.slice(0, 8))}</span>
          <div class="appointment-actions">
            <button class="secondary" type="button" onclick="toggleStatus('${item.id}')">
              ${item.status === "done" ? "Reabrir" : "Concluir"}
            </button>
            <button class="secondary" type="button" onclick="editAppointment('${item.id}')">Editar</button>
            <button class="text" type="button" onclick="deleteAppointment('${item.id}')">Excluir</button>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function updateStats() {
  totalCount.textContent = appointments.length;
  pendingCount.textContent = appointments.filter((item) => item.status === "pending").length;
  doneCount.textContent = appointments.filter((item) => item.status === "done").length;
}

function sortAppointments() {
  appointments.sort((a, b) => {
    const left = `${a.date}T${a.time}`;
    const right = `${b.date}T${b.time}`;
    return left.localeCompare(right);
  });
}

function formatDate(date) {
  return date.toISOString().split("T")[0];
}

function editAppointment(id) {
  const item = appointments.find((entry) => entry.id === id);
  if (!item) {
    return;
  }

  appointmentId.value = item.id;
  clientInput.value = item.client;
  serviceInput.value = item.service;
  dateInput.value = item.date;
  timeInput.value = item.time;
  statusInput.value = item.status;
  contactInput.value = item.contact;
  notesInput.value = item.notes;
  submitButton.textContent = "Atualizar agendamento";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function toggleStatus(id) {
  appointments = appointments.map((item) => {
    if (item.id !== id) {
      return item;
    }

    return {
      ...item,
      status: item.status === "done" ? "pending" : "done"
    };
  });

  sortAppointments();
  persistAppointments();
  renderAppointments();
  updateStats();
}

function deleteAppointment(id) {
  appointments = appointments.filter((item) => item.id !== id);
  persistAppointments();
  renderAppointments();
  updateStats();

  if (appointmentId.value === id) {
    resetForm();
  }
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

window.editAppointment = editAppointment;
window.toggleStatus = toggleStatus;
window.deleteAppointment = deleteAppointment;
