import Hyperswarm from 'hyperswarm'
import Hyperdrive from 'hyperdrive'
import Localdrive from 'localdrive'
import Corestore from 'corestore'
import crypto from 'hypercore-crypto'
import b4a from 'b4a'
import { join } from 'path'
import fs from 'fs'

// Initialize variables
const swarm = new Hyperswarm()
let drive = null
let local = null

// Create necessary directories with proper error handling
function ensureDirectoryExists(dir) {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  } catch (error) {
    console.error(`Error creating directory ${dir}:`, error)
    throw error
  }
}

// Initialize directories
const senderFolder = './sender-folder'
const downloadsFolder = './downloads'
const storageFolder = './storage'
const storageReceiverFolder = './storage-receiver'

try {
  ensureDirectoryExists(senderFolder)
  ensureDirectoryExists(downloadsFolder)
  ensureDirectoryExists(storageFolder)
  ensureDirectoryExists(storageReceiverFolder)
} catch (error) {
  console.error('Failed to initialize directories:', error)
  showStatus('Failed to initialize directories: ' + error.message, 'error')
}

// Clean up when app closes
window.addEventListener('beforeunload', () => {
  if (swarm) swarm.destroy()
})

// When there's a new connection, replicate the drive
swarm.on('connection', (socket) => {
  const name = b4a.toString(socket.remotePublicKey, 'hex').substr(0, 6)
  console.log('🔗 Connected to peer:', name)
  if (drive) {
    console.log('Starting replication with peer:', name)
    drive.replicate(socket)
  }
})

// Update UI when swarm connections change
swarm.on('update', () => {
  document.querySelector('#peers-count').textContent = `Connected Peers: ${swarm.connections.size}`
})

// Create a new sharing session
async function createSession() {
  try {
    document.querySelector('#setup').classList.add('hidden')
    document.querySelector('#loading').classList.remove('hidden')

    console.log('Creating Corestore...')
    const store = new Corestore(storageFolder)
    await store.ready()

    console.log('Creating Hyperdrive...')
    drive = new Hyperdrive(store)
    await drive.ready()

    console.log('Setting up Localdrive...')
    local = new Localdrive(senderFolder)

    console.log('Joining swarm...')
    const discovery = swarm.join(drive.discoveryKey, { client: false, server: true })
    await discovery.flushed()
    store.findingPeers()

    const key = drive.key.toString('hex')
    document.querySelector('#loading').classList.add('hidden')
    document.querySelector('#sharing').classList.remove('hidden')
    
    // Update the UI with the session key
    const keyDisplay = document.querySelector('#public-key')
    if (keyDisplay) {
      keyDisplay.textContent = key
    }

    // Update peers count
    document.querySelector('#peers-count').textContent = '0'

    console.log('Session created with key:', key)
  } catch (error) {
    console.error('Error creating session:', error)
    showStatus('Error creating session: ' + error.message, 'error')
    document.querySelector('#loading').classList.add('hidden')
    document.querySelector('#setup').classList.remove('hidden')
  }
}

// Join an existing sharing session
async function joinSession(keyHex) {
  try {
    document.querySelector('#setup').classList.add('hidden')
    document.querySelector('#loading').classList.remove('hidden')

    console.log('Creating Corestore...')
    const store = new Corestore(storageReceiverFolder)
    await store.ready()

    console.log('Creating Hyperdrive...')
    drive = new Hyperdrive(store, Buffer.from(keyHex, 'hex'))
    await drive.ready()

    console.log('Setting up Localdrive...')
    local = new Localdrive(downloadsFolder)
    console.log('Downloads folder path:', downloadsFolder)

    console.log('Joining swarm...')
    const discovery = swarm.join(drive.discoveryKey, { client: true, server: false })
    await discovery.flushed()
    store.findingPeers()

    document.querySelector('#loading').classList.add('hidden')
    document.querySelector('#receiving').classList.remove('hidden')

    // First, list all files in the drive
    console.log('Listing files in drive...')
    const files = []
    for await (const entry of drive.list('/')) {
      files.push(entry)
      console.log('Found file:', entry.key)
    }

    if (files.length > 0) {
      console.log('Downloading files...')
      showStatus('Downloading files...', 'info')
      
      // Download each file individually
      for (const entry of files) {
        try {
          console.log('Downloading file:', entry.key)
          await drive.download(entry.key)
          console.log('File downloaded:', entry.key)
          
          // Get the file content
          const content = await drive.get(entry.key)
          if (content) {
            // Save to downloads folder
            const filePath = join(downloadsFolder, entry.key.replace('/', ''))
            console.log('Saving file to:', filePath)
            fs.writeFileSync(filePath, content)
            console.log('File saved successfully')
          }
          
          showStatus(`Downloaded: ${entry.key}`, 'success')
        } catch (error) {
          console.error('Error downloading file:', entry.key, error)
          showStatus(`Error downloading: ${entry.key}`, 'error')
        }
      }
    }

    // Start mirroring files from the drive to downloads folder
    console.log('Starting file mirroring...')
    const mirror = drive.mirror(local)
    await mirror.done()
    console.log('Initial mirroring complete')
    showStatus('Initial files downloaded', 'success')

    // Watch for file changes
    console.log('Watching for new files...')
    const watcher = drive.watch()
    for await (const [current, previous] of watcher) {
      if (current) {
        console.log('Received file update:', current.version)
        // Download any new files
        await drive.download('/')
        console.log('New files downloaded')
        
        // List and save new files
        for await (const entry of drive.list('/')) {
          const content = await drive.get(entry.key)
          if (content) {
            const filePath = join(downloadsFolder, entry.key.replace('/', ''))
            console.log('Saving new file to:', filePath)
            fs.writeFileSync(filePath, content)
            console.log('New file saved successfully')
          }
        }
        
        showStatus('New files received', 'success')
      }
    }

    console.log('Joined session')
  } catch (error) {
    console.error('Error joining session:', error)
    showStatus('Error joining session: ' + error.message, 'error')
    document.querySelector('#loading').classList.add('hidden')
    document.querySelector('#setup').classList.remove('hidden')
  }
}

// Handle file selection and sharing
async function handleFileSelect() {
  try {
    const input = document.createElement('input')
    input.type = 'file'
    input.onchange = async (e) => {
      const file = e.target.files[0]
      if (!file) return

      console.log('Selected file:', file.name)
      const reader = new FileReader()
      reader.onload = async () => {
        const buffer = Buffer.from(reader.result)
        const filePath = join('/', file.name)
        
        try {
          console.log('Uploading file to drive:', filePath)
          await drive.put(filePath, buffer)
          console.log('File uploaded to drive')
          
          // Force update the drive
          console.log('Updating drive...')
          await drive.update({ wait: true })
          console.log('Drive updated')
          
          showStatus('File shared successfully: ' + file.name, 'success')
        } catch (error) {
          console.error('Error sharing file:', error)
          showStatus('Error sharing file: ' + error.message, 'error')
        }
      }
      reader.readAsArrayBuffer(file)
    }
    input.click()
  } catch (error) {
    console.error('Error selecting file:', error)
    showStatus('Error selecting file: ' + error.message, 'error')
  }
}

// Make showSetup globally available
window.showSetup = function() {
  // Hide all views
  document.querySelectorAll('.view').forEach(view => view.classList.add('hidden'))
  // Show setup view
  document.querySelector('#setup').classList.remove('hidden')
  
  // Clean up any existing connections
  if (swarm) {
    swarm.destroy()
  }
  if (drive) {
    drive.close()
    drive = null
  }
  if (local) {
    local = null
  }
}

window.handleFileSelect = handleFileSelect;

// Copy key to clipboard
window.copyKey = async function() {
  const keyElement = document.querySelector('#public-key');
  if (keyElement && keyElement.textContent) {
    try {
      await navigator.clipboard.writeText(keyElement.textContent);
      showStatus('Key copied to clipboard!', 'success');
    } catch (err) {
      showStatus('Failed to copy key: ' + err.message, 'error');
    }
  }
}

// Add event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const createSessionBtn = document.querySelector('#create-session')
  if (createSessionBtn) {
    createSessionBtn.addEventListener('click', createSession)
  }

  const joinForm = document.querySelector('#join-form')
  if (joinForm) {
    joinForm.addEventListener('submit', (e) => {
      e.preventDefault()
      const key = document.querySelector('#session-key-input').value
      if (key) {
        joinSession(key)
      }
    })
  }
})

function showStatus(message, type) {
  const status = document.getElementById('status')
  status.textContent = message
  status.className = type
  setTimeout(() => {
    status.textContent = ''
    status.className = ''
  }, 5000)
} 