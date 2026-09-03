\# NAHVI â€” AI Desktop Assistant



> A futuristic AI desktop assistant built to combine conversational AI, voice interaction, automation, memory, file utilities, and Windows system control into a single desktop experience.



NAHVI is a Windows-focused AI assistant project designed around a simple idea:



\*\*One interface for interacting with AI and controlling useful desktop workflows.\*\*



The project combines a React-based interface, an Electron desktop shell, and a Node.js backend that connects AI capabilities with practical desktop actions.



\---



\## âœ¦ What is NAHVI?



NAHVI is an AI desktop assistant that brings together:



\- Conversational AI

\- Multiple AI model providers

\- Voice input/output capabilities

\- Desktop automation

\- Windows system control

\- Application launching

\- File search and file handling

\- Document reading

\- Memory

\- Notes generation

\- Intent detection

\- Command parsing

\- Utility commands

\- A futuristic desktop interface



The goal is to make AI interaction feel less like using a chatbot and more like interacting with a personal desktop operating system.



\---



\## âœ¦ Core Capabilities



\### AI Interaction



NAHVI can route conversational requests through configured AI providers and present responses through the desktop interface.



Current integrations include:



\- Groq

\- Google Gemini



API credentials are loaded through environment variables and are never intended to be committed to the repository.



\---



\### Voice Interaction



NAHVI includes voice input/output infrastructure designed for hands-free interaction with the assistant.



The project also contains local voice/runtime components used by the application.



\---



\### Desktop Automation



The backend contains functionality for interacting with the Windows desktop, including:



\- Mouse movement

\- Mouse clicking

\- Keyboard interaction

\- Windows PowerShell execution

\- Application launching

\- Desktop actions



The system-control layer is implemented through the backend rather than exposing direct Node.js access to the renderer.



\---



\### Application Launcher



NAHVI includes application-launching functionality that allows commands to be mapped to desktop applications.



This creates a bridge between natural-language commands and local Windows applications.



\---



\### File Utilities



The backend includes utilities for:



\- File searching

\- File handling

\- File organization

\- Document reading



This allows NAHVI to operate as a practical desktop assistant rather than only a conversational interface.



\---



\### Memory



NAHVI has a local memory system for retaining assistant interaction data during runtime.



Runtime memory is intentionally excluded from the public repository to prevent private conversation history from being published.



\---



\### Notes \& Utilities



The backend also includes functionality for:



\- Notes generation

\- Calculations

\- Intent detection

\- Command parsing

\- Response modes



These components allow the assistant to interpret different types of user requests and route them to appropriate functionality.



\---



\# âœ¦ Architecture



NAHVI is organized around three primary layers:



```text

â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”

â”‚              NAHVI Desktop UI                â”‚

â”‚            React + Vite + CSS                â”‚

â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

&#x20;                      â”‚

&#x20;                      â–¼

â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”

â”‚             Electron Desktop Shell           â”‚

â”‚                  Electron                    â”‚

â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

&#x20;                      â”‚

&#x20;                      â–¼

â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”

â”‚                Node.js Backend               â”‚

â”‚                                              â”‚

â”‚  Command Parser      Intent Detection        â”‚

â”‚  AI Providers        Memory                  â”‚

â”‚  File Utilities      Desktop Control         â”‚

â”‚  App Launcher        Notes / Utilities       â”‚

â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

&#x20;                      â”‚

&#x20;            â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”

&#x20;            â–¼                   â–¼

&#x20;      AI Providers        Windows System

&#x20;      Groq / Gemini       \& Local Utilities
