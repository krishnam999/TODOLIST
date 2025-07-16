
let tasks = [];
let counter = 1;

// Load tasks from localStorage on page load
window.onload = function() {
  const saved = localStorage.getItem('tasks');
  if (saved) {
    tasks = JSON.parse(saved);
    counter = tasks.length ? Math.max(...tasks.map(t => t.id)) + 1 : 1;
    renderTasks();
  }
};

document.getElementById("taskInput").addEventListener("keydown", function(event) {
  if (event.key === "Enter") {
    add();
  }
});

// Listen for Enter key globally to trigger multi-delete in selection mode
document.addEventListener("keydown", function(event) {
  if (selectionMode && event.key === "Enter") {
    event.preventDefault();
    window.confirmMultiDelete();
  }
});

let justAddedId = null;
let selectionMode = false;
let selectedTasks = new Set();
let deleteHoldTimeout = null;

const add = () => {
  const taskinput = document.getElementById("taskInput");
  const task = taskinput.value.trim();
  if (task !== "") {
    const taskObj = { id: counter, text: task, done: false };
    tasks.push(taskObj);
    saveTasks();
    justAddedId = taskObj.id;
    renderTasks();
    counter++;
  }
  taskinput.value = "";
};


// --- Drag multi-select support ---
let isDraggingSelect = false;
let dragSelectedIds = new Set();

function renderTasks() {
  const taskCont = document.getElementById("taskContainer");
  if (tasks.length === 0) {
    taskCont.innerHTML = '<p class="text-center text-gray-400">No task added yet</p>';
    return;
  }
  taskCont.innerHTML = "";
  // Show info box if in selection mode
  if (selectionMode) {
    let infoBox = document.getElementById('multi-select-info');
    if (!infoBox) {
      infoBox = document.createElement('div');
      infoBox.id = 'multi-select-info';
      infoBox.className = 'fixed top-6 left-1/2 -translate-x-1/2 z-40 bg-blue-500 text-white px-6 py-2 rounded-xl shadow-lg text-base font-semibold flex items-center gap-2';
      document.body.appendChild(infoBox);
    }
    infoBox.textContent = 'Selection mode: Select multiple tasks by clicking or dragging, then hit Enter to delete.';
  } else {
    const infoBox = document.getElementById('multi-select-info');
    if (infoBox) infoBox.remove();
  }

  // Show newest tasks on top (stack order)
  [...tasks].reverse().forEach((taskObj) => {
    const animClass = (justAddedId === taskObj.id) ? 'task-pop-in' : '';
    const isSelected = selectedTasks.has(taskObj.id);
    // Only allow hold-to-enable-selection and click-to-select
    taskCont.innerHTML += `
      <div id="task${taskObj.id}" data-role="m" data-taskid="${taskObj.id}" class="w-full h-14 bg-gray-200 flex items-center justify-between px-4 py-7 gap-2${taskObj.done ? ' bg-green-200' : ''} ${animClass} ${selectionMode ? 'cursor-pointer' : ''} ${isSelected ? 'ring-4 ring-blue-400' : ''}"
        onmousedown="${selectionMode ? '' : `startContainerHold(${taskObj.id})`}"
        onmouseup="${selectionMode ? '' : 'cancelContainerHold()'}"
        onmouseleave="${selectionMode ? '' : 'cancelContainerHold()'}"
        onclick="${selectionMode ? `selectTask(${taskObj.id})` : ''}">
        <div class="flex flex-row gap-3 justify-center items-center">
          <div data-role="main" onclick="done('task${taskObj.id}')" class="cursor-pointer ${taskObj.done ? 'bg-green-500' : 'bg-red-700'} w-4 h-4 border-1 border-black rounded-full shadow-lg hover:scale-110 hover:brightness-110 active:scale-115 transition-all duration-200 flex justify-center items-center"></div>
          <p class="font-semibold text-gray-700 break-words overflow-x-scroll ">${taskObj.text}</p>
        </div>
        <button id="deleteBtn${taskObj.id}" class="bg-gradient-to-r from-red-500 to-red-800 shadow-lg hover:scale-110 hover:brightness-110 active:scale-95 transition-all duration-200 rounded-2xl px-3 py-1 flex items-center justify-center focus:outline-none"
          onclick="${selectionMode ? 'confirmMultiDelete()' : 'deletetask(\'task'+taskObj.id+'\')'}">
          <i class="ri-delete-bin-line text-white text-xl"></i>
        </button>
      </div>
    `;
  });

  // Animate only the just added task
  if (justAddedId !== null) {
    const justAddedTask = document.getElementById(`task${justAddedId}`);
    if (justAddedTask) {
      justAddedTask.classList.add('task-pop-in');
      setTimeout(() => {
        justAddedTask.classList.remove('task-pop-in');
        justAddedId = null;
      }, 350);
    } else {
      justAddedId = null;
    }
  }
  // Add pop-in animation CSS for adding tasks
  if (!document.getElementById('popInStyle')) {
    const styleAdd = document.createElement('style');
    styleAdd.id = 'popInStyle';
    styleAdd.innerHTML = `
    .task-pop-in {
      animation: popIn 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    }
    @keyframes popIn {
      0% {
        opacity: 0;
        transform: scale(0.7);
      }
      80% {
        opacity: 1;
        transform: scale(1.08);
      }
      100% {
        opacity: 1;
        transform: scale(1);
      }
    }`;
    document.head.appendChild(styleAdd);
  }
}



function saveTasks() {
  localStorage.setItem('tasks', JSON.stringify(tasks));
}



window.deletetask = function(taskId) {
  if (selectionMode) return;
  const id = parseInt(taskId.replace('task', ''));
  const taskDiv = document.getElementById(taskId);
  if (taskDiv) {
    taskDiv.classList.add('task-slide-delete');
    taskDiv.style.pointerEvents = 'none';
    setTimeout(() => {
      tasks = tasks.filter(t => t.id !== id);
      saveTasks();
      renderTasks();
    }, 400);
  }
};


// Hold-to-enable-selection on task container
window.startContainerHold = function(taskId) {
  if (selectionMode) return;
  deleteHoldTimeout = setTimeout(() => {
    selectionMode = true;
    selectedTasks.clear();
    renderTasks();
    // Info box is now shown in renderTasks, no popup needed
  }, 1000); // 1 second hold
};

window.cancelContainerHold = function() {
  if (deleteHoldTimeout) {
    clearTimeout(deleteHoldTimeout);
    deleteHoldTimeout = null;
  }
};

window.selectTask = function(id) {
  if (!selectionMode) return;
  if (selectedTasks.has(id)) {
    selectedTasks.delete(id);
  } else {
    selectedTasks.add(id);
  }
  renderTasks();
};

window.confirmMultiDelete = function() {
  if (!selectionMode || selectedTasks.size === 0) return;
  showConfirmPopup({
    message: 'Are you sure you want to delete the selected tasks?',
    onYes: function() {
      tasks = tasks.filter(t => !selectedTasks.has(t.id));
      saveTasks();
      selectionMode = false;
      selectedTasks.clear();
      renderTasks();
      hideConfirmPopup();
    },
    onNo: function() {
      hideConfirmPopup();
    }
  });
};

// Custom modal popup for confirmation
function showConfirmPopup({ message, onYes, onNo }) {
  let modal = document.getElementById('confirm-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'confirm-modal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50';
    modal.innerHTML = `
      <div class="bg-white rounded-3xl shadow-2xl p-8 flex flex-col items-center min-w-[320px] animate-fade-in border-2 border-red-200">
        <div class="flex flex-col items-center mb-4">
          <div class="bg-red-100 rounded-full p-3 mb-2 animate-bounce">
            <svg xmlns='http://www.w3.org/2000/svg' class='h-8 w-8 text-red-600' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M6 18L18 6M6 6l12 12'/></svg>
          </div>
          <div class="text-xl font-bold text-red-700 mb-1">Confirm Deletion</div>
          <div class="text-base text-gray-700 text-center" id="confirm-modal-message"></div>
        </div>
        <div class="flex gap-8 mt-4">
          <button id="confirm-modal-yes" class="px-7 py-2 rounded-xl bg-gradient-to-r from-red-500 to-red-700 text-white font-bold shadow-lg hover:scale-105 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-red-400 transition-all duration-150">Yes, Delete</button>
          <button id="confirm-modal-no" class="px-7 py-2 rounded-xl bg-gray-200 text-gray-800 font-bold shadow-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-all duration-150">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  } else {
    modal.style.display = 'flex';
  }
  document.getElementById('confirm-modal-message').textContent = message;
  document.getElementById('confirm-modal-yes').onclick = onYes;
  document.getElementById('confirm-modal-no').onclick = onNo;
  // Animate in
  modal.querySelector('div').classList.add('animate-fade-in');
}

function hideConfirmPopup() {
  const modal = document.getElementById('confirm-modal');
  if (modal) {
    modal.style.display = 'none';
  }
}

// Add fade-in animation for modal if not present
if (!document.getElementById('fadeInStyle')) {
  const styleFade = document.createElement('style');
  styleFade.id = 'fadeInStyle';
  styleFade.innerHTML = `
    .animate-fade-in {
      animation: fadeInModal 0.22s cubic-bezier(0.4,0,0.2,1);
    }
    @keyframes fadeInModal {
      0% { opacity: 0; transform: scale(0.92); }
      100% { opacity: 1; transform: scale(1); }
    }
  `;
  document.head.appendChild(styleFade);
}

// Add simple slide delete animation CSS
const styleDelete = document.createElement('style');
styleDelete.innerHTML = `
.task-slide-delete {
  animation: taskSlideDelete 0.4s cubic-bezier(0.4,0,0.2,1) forwards;
}
@keyframes taskSlideDelete {
  0% {
    opacity: 1;
    transform: translateX(0);
  }
  100% {
    opacity: 0;
    transform: translateX(120px);
  }
}`;
document.head.appendChild(styleDelete);

window.done = function(taskId) {
  const id = parseInt(taskId.replace('task', ''));
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.done = !task.done;
    saveTasks();
    renderTasks();
  }
};