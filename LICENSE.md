# NAHVI - AI Desktop Assistant

> A futuristic Windows desktop AI assistant combining conversational AI, voice interaction, automation, memory, file utilities, and system control.

NAHVI is a desktop AI assistant built with React, Electron, and Node.js. It connects AI models with practical desktop capabilities so natural-language requests can trigger useful local workflows.

## What is NAHVI?

NAHVI brings together:

- Conversational AI
- Multiple AI providers
- Voice interaction infrastructure
- Windows desktop automation
- Application launching
- File search and file handling
- Document reading
- Local runtime memory
- Notes generation
- Intent detection
- Command parsing
- Utility commands
- Futuristic desktop interface

## Core Capabilities

### AI Integration

NAHVI is designed to work with multiple AI providers.

Configured providers include:

- Groq
- Google Gemini

API credentials are loaded through environment variables and should never be committed to the repository.

### Voice Interaction

NAHVI includes voice input and output infrastructure for hands-free assistant interaction.

Some local runtime components are environment-dependent and are intentionally excluded from the public source repository.

### Desktop Automation

The backend contains modules for Windows desktop actions such as:

- Mouse movement and clicking
- Keyboard interaction
- PowerShell and system actions
- Application launching
- Desktop control workflows

### Application Launcher

NAHVI can interact with local applications through its application-launching capabilities, allowing natural-language commands to trigger supported desktop applications.

### File and Document Utilities

NAHVI includes utilities for:

- File search
- File handling
- File organization
- Document reading

These modules allow the assistant to work with files and documents as part of desktop workflows.

### Memory

NAHVI includes local runtime memory for maintaining assistant-related information during use.

Runtime memory and personal conversation data are intentionally excluded from the public repository.

### Notes and Utilities

Additional backend capabilities include:

- Note generation
- Calculator functionality
- Command parsing
- Intent detection
- Response modes
- Utility workflows

---

## Architecture

```text
+------------------------------+
|        NAHVI Frontend        |
|        React + Vite          |
+---------------+--------------+
                |
                v
+------------------------------+
|      Electron Desktop Shell  |
+---------------+--------------+
                |
                v
+------------------------------+
|        Node.js Backend       |
|                              |
| Command Parser               |
| Intent Detection             |
| AI Providers                 |
| Desktop Control              |
| App Launcher                 |
| File Utilities               |
| Document Reader              |
| Memory / Notes / Utilities   |
+---------------+--------------+
        +-------+-------+
        |               |
        v               v
   Groq / Gemini   Windows / Local
