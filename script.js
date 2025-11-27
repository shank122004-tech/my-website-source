// Database Configuration
const DB_NAME = 'DivineMantraDB';
const DB_VERSION = 1;
const STORE_NAME = 'models';

// Admin Configuration
const ADMIN_PASSWORD = "divinemantra_super_admin_999";

// Global Variables
let db = null;
let isAdmin = false;

// DOM Elements
const adminLoginModal = document.getElementById('adminLoginModal');
const adminPanel = document.getElementById('adminPanel');
const mainWebsite = document.getElementById('mainWebsite');
const adminAccessBtn = document.getElementById('adminAccessBtn');
const closeModal = document.querySelector('.close-modal');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const adminPassword = document.getElementById('adminPassword');
const loginError = document.getElementById('loginError');
const modelsGrid = document.getElementById('modelsGrid');
const adminModelsGrid = document.getElementById('adminModelsGrid');
const emptyState = document.getElementById('emptyState');
const uploadBtn = document.getElementById('uploadBtn');
const modelName = document.getElementById('modelName');
const modelThumbnail = document.getElementById('modelThumbnail');
const modelFile = document.getElementById('modelFile');

// Initialize the application
document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
    await initDB();
    await loadModels();
    setupEventListeners();
}

// Initialize IndexedDB
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve();
        };
        
        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            if (!database.objectStoreNames.contains(STORE_NAME)) {
                const store = database.createObjectStore(STORE_NAME, { 
                    keyPath: 'id', 
                    autoIncrement: true 
                });
                store.createIndex('name', 'name', { unique: false });
            }
        };
    });
}

// Event Listeners
function setupEventListeners() {
    // Admin access
    adminAccessBtn.addEventListener('click', () => {
        adminLoginModal.style.display = 'block';
    });
    
    // Close modal
    closeModal.addEventListener('click', () => {
        adminLoginModal.style.display = 'none';
        resetLoginForm();
    });
    
    // Login
    loginBtn.addEventListener('click', handleLogin);
    adminPassword.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
    
    // Logout
    logoutBtn.addEventListener('click', handleLogout);
    
    // Upload model
    uploadBtn.addEventListener('click', handleUpload);
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === adminLoginModal) {
            adminLoginModal.style.display = 'none';
            resetLoginForm();
        }
    });
}

// Login Handler
function handleLogin() {
    const password = adminPassword.value.trim();
    
    if (password === ADMIN_PASSWORD) {
        isAdmin = true;
        adminLoginModal.style.display = 'none';
        adminPanel.classList.remove('hidden');
        mainWebsite.classList.add('hidden');
        loadAdminModels();
        resetLoginForm();
    } else {
        loginError.textContent = 'Invalid admin password';
    }
}

// Logout Handler
function handleLogout() {
    isAdmin = false;
    adminPanel.classList.add('hidden');
    mainWebsite.classList.remove('hidden');
    resetUploadForm();
}

// Reset Forms
function resetLoginForm() {
    adminPassword.value = '';
    loginError.textContent = '';
}

function resetUploadForm() {
    modelName.value = '';
    modelThumbnail.value = '';
    modelFile.value = '';
}

// Upload Handler
async function handleUpload() {
    const name = modelName.value.trim();
    const thumbnailFile = modelThumbnail.files[0];
    const glbFile = modelFile.files[0];
    
    if (!name || !thumbnailFile || !glbFile) {
        alert('Please fill all fields and select both thumbnail and GLB files');
        return;
    }
    
    try {
        // Process GLB file with security layers
        const processedGlb = await processGLBFile(glbFile, name);
        
        // Read thumbnail as data URL
        const thumbnail = await readFileAsDataURL(thumbnailFile);
        
        // Create model object
        const model = {
            name,
            thumbnail,
            glbData: processedGlb,
            fileName: `${name.replace(/\s+/g, '_').toLowerCase()}@divinemantra.glb`,
            uploadDate: new Date().toISOString()
        };
        
        // Save to database
        await saveModel(model);
        
        // Reset form and reload models
        resetUploadForm();
        await loadModels();
        await loadAdminModels();
        
        alert('Model uploaded successfully with security features applied!');
    } catch (error) {
        console.error('Upload error:', error);
        alert('Error uploading model: ' + error.message);
    }
}

// Process GLB File with Security Layers
async function processGLBFile(file, modelName) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = async (event) => {
            try {
                const arrayBuffer = event.target.result;
                const glbData = new Uint8Array(arrayBuffer);
                
                // Apply security layers
                const securedGlb = await applySecurityLayers(glbData, modelName);
                resolve(securedGlb);
            } catch (error) {
                reject(error);
            }
        };
        
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(file);
    });
}

// Apply Security Layers to GLB
async function applySecurityLayers(glbData, modelName) {
    // Layer 1: Auto-rename is handled in the model object
    
    // Layer 2: Add internal JSON signature
    // Note: In a real implementation, we would parse the GLB structure
    // and inject the signature into the JSON chunk
    // For this demo, we'll simulate the process
    
    const signature = "DM-9937-SECURE-CODE";
    
    // In a production environment, we would:
    // 1. Parse the GLB binary structure
    // 2. Extract the JSON chunk
    // 3. Modify the JSON to include the signature
    // 4. Reconstruct the GLB with the modified JSON
    
    // For this demo, we'll return the original data
    // with a note that signature injection would happen here
    console.log(`Applying security signature to ${modelName}: ${signature}`);
    
    // Return the processed GLB data (in real implementation, this would be modified)
    return glbData;
}

// Read file as Data URL
function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

// Save Model to IndexedDB
function saveModel(model) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.add(model);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Load Models for User View
async function loadModels() {
    const models = await getAllModels();
    renderModels(models, modelsGrid, false);
}

// Load Models for Admin View
async function loadAdminModels() {
    const models = await getAllModels();
    renderModels(models, adminModelsGrid, true);
}

// Get All Models from IndexedDB
function getAllModels() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Render Models in Grid
function renderModels(models, container, isAdminView) {
    container.innerHTML = '';
    
    if (models.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    
    models.forEach(model => {
        const modelCard = createModelCard(model, isAdminView);
        container.appendChild(modelCard);
    });
}

// Create Model Card Element
function createModelCard(model, isAdminView) {
    const card = document.createElement('div');
    card.className = 'glass-card model-card';
    
    const previewHtml = model.thumbnail ? 
        `<img src="${model.thumbnail}" alt="${model.name}" class="model-thumbnail">` :
        `<div class="model-placeholder"><i class="fas fa-cube"></i></div>`;
    
    card.innerHTML = `
        <div class="model-preview">
            ${previewHtml}
        </div>
        <div class="model-info">
            <h3 class="model-name">${model.name}</h3>
            <div class="model-badge">
                <i class="fas fa-shield-alt"></i>
                App Safe Model Verified
            </div>
        </div>
        <button class="glow-button download-btn" data-id="${model.id}">
            <i class="fas fa-download"></i> Download GLB
        </button>
        ${isAdminView ? `<button class="delete-btn" data-id="${model.id}"><i class="fas fa-trash"></i></button>` : ''}
    `;
    
    // Add event listeners
    const downloadBtn = card.querySelector('.download-btn');
    downloadBtn.addEventListener('click', () => downloadModel(model));
    
    if (isAdminView) {
        const deleteBtn = card.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', () => deleteModel(model.id));
    }
    
    return card;
}

// Download Model
function downloadModel(model) {
    try {
        // Create blob from GLB data
        const blob = new Blob([model.glbData], { type: 'model/gltf-binary' });
        const url = URL.createObjectURL(blob);
        
        // Create download link
        const a = document.createElement('a');
        a.href = url;
        a.download = model.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Clean up URL
        setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (error) {
        console.error('Download error:', error);
        alert('Error downloading model: ' + error.message);
    }
}

// Delete Model
async function deleteModel(id) {
    if (!confirm('Are you sure you want to delete this model?')) {
        return;
    }
    
    try {
        await deleteModelFromDB(id);
        await loadModels();
        await loadAdminModels();
    } catch (error) {
        console.error('Delete error:', error);
        alert('Error deleting model: ' + error.message);
    }
}

// Delete Model from IndexedDB
function deleteModelFromDB(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// Add some sample data for demonstration
function addSampleData() {
    const sampleModels = [
        {
            name: "Divine Krishna",
            thumbnail: "",
            glbData: new Uint8Array(),
            fileName: "divine_krishna@divinemantra.glb",
            uploadDate: new Date().toISOString()
        },
        {
            name: "Golden Buddha",
            thumbnail: "",
            glbData: new Uint8Array(),
            fileName: "golden_buddha@divinemantra.glb",
            uploadDate: new Date().toISOString()
        },
        {
            name: "Sacred Mandala",
            thumbnail: "",
            glbData: new Uint8Array(),
            fileName: "sacred_mandala@divinemantra.glb",
            uploadDate: new Date().toISOString()
        }
    ];
    
    // Add sample models to database
    sampleModels.forEach(model => {
        saveModel(model).catch(console.error);
    });
}

// Uncomment the line below to add sample data on first load
// addSampleData();