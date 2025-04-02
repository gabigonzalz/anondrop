# AnonDrop Technical Documentation

## Core Components

### Dependencies
- `hyperswarm`: Handles peer discovery and connection management
  - Uses DHT for peer discovery
  - Manages NAT traversal
  - Handles connection pooling
- `hyperdrive`: Manages P2P file storage
  - Content-addressable storage
  - File versioning
  - Efficient replication
- `localdrive`: Handles local file system operations
  - File reading/writing
  - Directory management
  - File watching
- `corestore`: Manages the storage backend
  - Persistent storage
  - Data indexing
  - Cache management
- `hypercore-crypto`: Provides cryptographic functions
  - Key generation
  - Hash functions
  - Encryption/decryption
- `b4a`: Handles binary data operations
  - Buffer manipulation
  - Binary encoding/decoding
  - Data conversion

## Directory Structure

```
AnonDrop/
├── app.js              # Main application logic
├── index.html          # User interface
├── sender-folder/      # Source files for sharing
├── downloads/          # Destination for received files
├── storage/           # Hyperdrive storage for sender
└── storage-receiver/  # Hyperdrive storage for receiver
```

## Core Functions

### Directory Management

```javascript
function ensureDirectoryExists(dir)
```
- **Purpose**: Creates necessary directories if they don't exist
- **Parameters**:
  - `dir`: Directory path to create
- **Error Handling**: Throws error if directory creation fails
- **Usage**: Called during initialization to set up required folders
- **Implementation Details**:
  - Uses fs.existsSync for existence check
  - Uses fs.mkdirSync with recursive option
  - Logs errors for debugging

### Session Management

#### createSession()
```javascript
async function createSession()
```
- **Purpose**: Creates a new file sharing session
- **Process**:
  1. Initializes Corestore for storage
  2. Creates new Hyperdrive instance
  3. Sets up Localdrive for sender folder
  4. Joins Hyperswarm network
  5. Generates and displays session key
- **Error Handling**: Shows error message if session creation fails
- **UI Updates**: 
  - Shows loading view during initialization
  - Displays session key in sharing view
  - Updates peer count
- **Implementation Details**:
  - Uses async/await for asynchronous operations
  - Implements proper cleanup on failure
  - Handles UI state transitions

#### joinSession(keyHex)
```javascript
async function joinSession(keyHex)
```
- **Purpose**: Joins an existing sharing session
- **Parameters**:
  - `keyHex`: Session key in hexadecimal format
- **Process**:
  1. Initializes Corestore for receiver storage
  2. Creates Hyperdrive instance with provided key
  3. Sets up Localdrive for downloads folder
  4. Joins Hyperswarm network
  5. Downloads existing files
  6. Sets up file watching
- **Error Handling**: Shows error message if joining fails
- **File Operations**:
  - Downloads existing files
  - Sets up file mirroring
  - Watches for new files
- **Implementation Details**:
  - Validates session key format
  - Handles file synchronization
  - Manages connection state

### File Operations

#### handleFileSelect()
```javascript
async function handleFileSelect()
```
- **Purpose**: Handles file selection and sharing
- **Process**:
  1. Creates file input element
  2. Reads selected file
  3. Uploads file to Hyperdrive
  4. Updates drive
- **Error Handling**: Shows error message if file sharing fails
- **UI Updates**: Shows success/error status messages
- **Implementation Details**:
  - Uses FileReader API
  - Handles multiple file selection
  - Manages file buffer conversion

### Network Operations

#### Swarm Connection Handler
```javascript
swarm.on('connection', async (socket))
```
- **Purpose**: Handles new peer connections
- **Process**:
  1. Logs connected peer
  2. Updates peer count
  3. Sets up drive replication
- **Replication**: Creates bidirectional stream for file sharing
- **Implementation Details**:
  - Uses DHT for peer discovery
  - Manages connection state
  - Handles stream errors

## Data Flow

1. **Session Creation**:
   ```
   User → createSession() → Corestore → Hyperdrive → Hyperswarm → Session Key
   ```
   - User initiates session
   - Corestore initializes storage
   - Hyperdrive creates drive
   - Hyperswarm joins network
   - Session key generated

2. **File Sharing**:
   ```
   User → handleFileSelect() → FileReader → Hyperdrive → Hyperswarm → Peer
   ```
   - User selects file
   - FileReader reads file
   - Hyperdrive stores file
   - Hyperswarm replicates to peer

3. **File Receiving**:
   ```
   Peer → Hyperswarm → Hyperdrive → Localdrive → Downloads Folder
   ```
   - Peer sends file
   - Hyperswarm receives data
   - Hyperdrive stores file
   - Localdrive saves to disk

## Error Handling

- All async operations are wrapped in try-catch blocks
- Errors are logged to console and displayed to user
- Connection errors are handled gracefully
- File operation errors show appropriate messages
- Implementation includes:
  - Network error recovery
  - File system error handling
  - UI state management
  - Resource cleanup

## Security Considerations

1. **Peer Discovery**:
   - Uses Hyperswarm's DHT for peer discovery
   - No central server required
   - Secure key exchange
   - NAT traversal support

2. **File Transfer**:
   - Direct peer-to-peer transfer
   - No intermediate storage
   - Session-based access control
   - Stream encryption

3. **Data Storage**:
   - Local storage only
   - No cloud storage
   - Temporary storage in designated folders
   - Secure file handling

## Performance Considerations

1. **File Operations**:
   - Asynchronous file handling
   - Stream-based file transfer
   - Efficient file watching
   - Buffer management

2. **Network**:
   - Optimized peer discovery
   - Efficient replication
   - Connection pooling
   - Bandwidth management

3. **Storage**:
   - Local file system operations
   - Efficient drive updates
   - Minimal memory usage
   - Cache optimization

## Known Issues and Limitations

1. **File Transfer**:
   - No progress indication
   - No file size validation
   - No transfer cancellation
   - Basic error recovery

2. **Network**:
   - Limited testing on edge cases
   - Basic connection recovery
   - No bandwidth throttling
   - Simple reconnection logic

3. **UI/UX**:
   - Basic error messages
   - Limited status updates
   - No transfer queue
   - Simple file selection

## Future Improvements

1. **File Transfer**:
   - Add progress bars
   - Implement file validation
   - Add transfer cancellation
   - Enhanced error recovery

2. **Network**:
   - Improve connection stability
   - Add bandwidth management
   - Enhanced reconnection logic
   - Better error handling

3. **UI/UX**:
   - Enhanced status updates
   - Transfer queue management
   - Better file selection
   - Improved error messages 