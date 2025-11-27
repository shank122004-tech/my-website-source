// Database Configuration
const DB_NAME = 'DivineMantraDB';
const DB_VERSION = 1;
const STORE_NAME = 'models';

// Admin Configuration
const ADMIN_PASSWORD = "Shashank@122004";

// Security Configuration
const SECURITY_SIGNATURE = "DM-9937-SECURE-CODE";

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
const uploadStatus = document.querySelector('.upload-status');
const progressFill = document.querySelector('.progress-fill');
const statusText = document.querySelector('.status-text');

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
        // Show upload status
        showUploadStatus(true);
        updateProgress(10, 'Reading GLB file...');
        
        // Process GLB file with security layers
        const processedGlb = await processGLBFile(glbFile, name);
        
        updateProgress(60, 'Processing thumbnail...');
        
        // Read thumbnail as data URL
        const thumbnail = await readFileAsDataURL(thumbnailFile);
        
        updateProgress(80, 'Saving model...');
        
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
        
        updateProgress(100, 'Upload complete!');
        
        // Reset form and reload models
        setTimeout(() => {
            resetUploadForm();
            showUploadStatus(false);
            loadModels();
            loadAdminModels();
            alert('Model uploaded successfully with security features applied!');
        }, 1000);
        
    } catch (error) {
        console.error('Upload error:', error);
        showUploadStatus(false);
        alert('Error uploading model: ' + error.message);
    }
}

// Show/Hide Upload Status
function showUploadStatus(show) {
    if (show) {
        uploadStatus.classList.remove('hidden');
    } else {
        uploadStatus.classList.add('hidden');
        progressFill.style.width = '0%';
    }
}

// Update Progress Bar
function updateProgress(percent, text) {
    progressFill.style.width = `${percent}%`;
    statusText.textContent = text;
}

// Process GLB File with Security Layers
async function processGLBFile(file, modelName) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = async (event) => {
            try {
                const arrayBuffer = event.target.result;
                updateProgress(30, 'Applying security signature...');
                
                // Apply security layers
                const securedGlb = await applySecurityLayers(arrayBuffer, modelName);
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
async function applySecurityLayers(arrayBuffer, modelName) {
    try {
        // Parse GLB structure
        const glbData = new Uint8Array(arrayBuffer);
        
        // GLB structure: [header (12 bytes)] + [chunk1] + [chunk2] + ...
        const header = glbData.slice(0, 12);
        const dataView = new DataView(arrayBuffer);
        
        // Check if it's a valid GLB file (magic: "glTF")
        const magic = dataView.getUint32(0, true);
        if (magic !== 0x46546C67) { // "glTF" in little-endian
            throw new Error('Invalid GLB file format');
        }
        
        const version = dataView.getUint32(4, true);
        const length = dataView.getUint32(8, true);
        
        let offset = 12;
        let jsonChunk = null;
        let binChunk = null;
        
        // Parse chunks
        while (offset < length) {
            const chunkLength = dataView.getUint32(offset, true);
            const chunkType = dataView.getUint32(offset + 4, true);
            
            if (chunkType === 0x4E4F534A) { // JSON chunk
                const chunkData = glbData.slice(offset + 8, offset + 8 + chunkLength);
                const jsonText = new TextDecoder().decode(chunkData);
                jsonChunk = JSON.parse(jsonText);
            } else if (chunkType === 0x004E4942) { // BIN chunk
                binChunk = glbData.slice(offset + 8, offset + 8 + chunkLength);
            }
            
            offset += 8 + chunkLength;
        }
        
        if (!jsonChunk) {
            throw new Error('No JSON chunk found in GLB file');
        }
        
        updateProgress(40, 'Injecting security signature...');
        
        // Add security signature to glTF asset
        if (!jsonChunk.asset) {
            jsonChunk.asset = {};
        }
        jsonChunk.asset.signature = SECURITY_SIGNATURE;
        jsonChunk.asset.generator = "DivineMantra Security System";
        
        updateProgress(50, 'Rebuilding GLB structure...');
        
        // Rebuild GLB with security signature
        const securedGlb = rebuildGLB(jsonChunk, binChunk);
        
        return securedGlb;
    } catch (error) {
        console.error('Security layer application failed:', error);
        throw new Error('Failed to apply security features: ' + error.message);
    }
}

// Rebuild GLB with modified JSON
function rebuildGLB(jsonData, binData) {
    // Convert JSON to string with proper formatting
    const jsonString = JSON.stringify(jsonData);
    
    // Calculate padding for JSON chunk (multiple of 4)
    const jsonPadding = (4 - (jsonString.length % 4)) % 4;
    const paddedJsonString = jsonString + ' '.repeat(jsonPadding);
    const jsonChunkData = new TextEncoder().encode(paddedJsonString);
    
    // Calculate total length
    let totalLength = 12; // Header
    totalLength += 8 + jsonChunkData.length; // JSON chunk
    
    if (binData) {
        const binPadding = (4 - (binData.length % 4)) % 4;
        totalLength += 8 + binData.length + binPadding; // BIN chunk
    }
    
    // Create new GLB buffer
    const newGlb = new Uint8Array(totalLength);
    const dataView = new DataView(newGlb.buffer);
    
    let offset = 0;
    
    // Write header
    dataView.setUint32(offset, 0x46546C67, true); // Magic: "glTF"
    dataView.setUint32(offset + 4, 2, true); // Version: 2
    dataView.setUint32(offset + 8, totalLength, true); // Total length
    offset += 12;
    
    // Write JSON chunk
    dataView.setUint32(offset, jsonChunkData.length, true); // Chunk length
    dataView.setUint32(offset + 4, 0x4E4F534A, true); // Chunk type: JSON
    offset += 8;
    
    newGlb.set(jsonChunkData, offset);
    offset += jsonChunkData.length;
    
    // Write BIN chunk if exists
    if (binData) {
        const binPadding = (4 - (binData.length % 4)) % 4;
        dataView.setUint32(offset, binData.length + binPadding, true); // Chunk length
        dataView.setUint32(offset + 4, 0x004E4942, true); // Chunk type: BIN
        offset += 8;
        
        newGlb.set(binData, offset);
        offset += binData.length;
        
        // Add padding
        for (let i = 0; i < binPadding; i++) {
            newGlb[offset + i] = 0x00;
        }
    }
    
    return newGlb;
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
    card.className = `glass-card model-card ${isAdminView ? 'admin-model-card' : ''}`;
    
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
