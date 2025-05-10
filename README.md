# Offline Notes App - Interview Task

## How to Run the App

This application is built using Next.js.

1.  **Clone/Fork:**
    ```bash
    git clone [https://github.com/jb04032000/offline-notes-test](https://github.com/jb04032000/offline-notes-test)
    cd offline-notes-test
    ```
2.  **Install Dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```
3.  **Run Development Server:**
    ```bash
    npm run dev
    # or
    yarn dev
    ```
    Open [http://localhost:3000](http://localhost:3000) in your browser.

## Current Architecture

This is a note-taking application designed to work offline first.

**Key Components:**

* **Frontend:** Built with [Next.js](https://nextjs.org/), [React](https://reactjs.org/), and [TypeScript](https://www.typescriptlang.org/).
* **Offline Storage:** Uses the browser's **IndexedDB** to store notes locally. This allows the core functionality (create, read, update, delete notes) to work even when offline.
* **Synchronization:**
    * The app detects online/offline status using `navigator.onLine`.
    * A **Service Worker** (`public/sw.js`, registered in `src/components/NoteList.tsx`) is set up to handle background sync events when the application comes online.
    * The `refreshNotes` function in `src/utils/notes.ts` attempts to fetch data from the server API and reconcile local (IndexedDB) and server states.
* **Backend API:** Next.js API routes are defined in `src/pages/api/`. These interact with the SQLite database.
* **UI:** React components located in `src/components`, styled with Tailwind CSS.

**What Works:**

* Creating, viewing, editing, and deleting notes while offline. Changes are saved to IndexedDB.
* Basic detection of online/offline status.
* The framework for triggering synchronization exists (Service Worker, `refreshNotes` function).
* Backend data store implemented using SQLite with `better-sqlite3`.
* Users can add and remove tags to notes.
* Notes can be filtered on the client-side by selecting tags.
* UI has been significantly improved with Tailwind CSS.

**What's Missing (as per the original requirements):**

* Explicit conflict detection logic to identify concurrent modifications.
* Conflict resolution UI.

**Architecture Diagram:**

```mermaid
graph LR
    subgraph Browser
        Client[Next.js Client]
        SW[Service Worker]
        IDB[(IndexedDB)]
    end
    subgraph Server
        ServerAPI[Next.js Server API]
    end
    subgraph Data Store
        DS[SQLite (better-sqlite3)]
    end
    Client -- Uses/Stores --> IDB
    Client -- Registers/Listens --> SW
    Client -- API Calls --> ServerAPI
    SW -- Sync Events --> Client
    ServerAPI -- Interacts With --> DS
Deliverables:
https://github.com/jb04032000/offline-notes-test

Crucially: This README.md file includes the following:

Backend Data Store:
For the backend data store, I chose to implement SQLite using the better-sqlite3 package. I opted for SQLite due to its simplicity and the fact that it's file-based, making it relatively easy to set up and manage for a demonstration project like this.

I specifically selected better-sqlite3 over the standard sqlite3 package because it generally offers better performance and a more modern API. It's known for being faster and providing a more convenient way to interact with SQLite databases in Node.js environments. While it might not be the ideal choice for a highly scalable production application, it serves well for illustrating the backend logic and integration with the API routes, and better-sqlite3 provides a smoother development experience.

To run the application with SQLite, you'll need to ensure the better-sqlite3 package is installed (which it should be if you followed the npm install or yarn install steps). The database file (notes.db) will be created in the root directory of the project if it doesn't already exist. No specific environment variables are needed for this setup.

State Management for Tagging and Filtering:
I managed the state for both the tagging and filtering features using React hooks.

Tagging: Within the NoteEditor component, I used useState to manage the current input value for adding new tags and another useState to hold the array of tags associated with the current note. When a user enters a tag and submits it, the tag is added to this local state. This state is then included when saving or updating the note, both locally in IndexedDB and via the API to the backend.
Filtering: In the NoteList component, I used useState to maintain the list of selected tags for filtering. A separate component (TagFilter) allows users to select tags. When the selected tags change, an useEffect hook filters the displayed notes based on whether their tags (stored locally in the notes data) include any of the selected filter tags.
Tag Storage Integration:
Tags are stored as a comma-separated string within the tags property of each note, both in the backend SQLite database and in the local IndexedDB.

Backend (SQLite): The notes table has a tags column of type TEXT to store these comma-separated strings. When saving or retrieving notes via the API, the tag array from the frontend is joined into a string before being stored, and the string from the database is split back into an array when retrieved.
Frontend (IndexedDB): The tags property of the note object stored in IndexedDB also holds an array of strings. When syncing data with the backend, the conversion between the array and the comma-separated string happens in the API routes and the refreshNotes utility function.
Pros of this structure:

Simplicity: It's relatively straightforward to implement and query in SQLite using LIKE clauses if more advanced filtering were needed on the backend.
Ease of transfer: Converting between an array in JavaScript and a simple string for storage and API transfer is easy.
Cons of this structure:

Querying complexity for advanced filtering: If we needed more complex backend filtering based on tags (e.g., notes with all of the selected tags), using LIKE clauses with comma-separated strings can become cumbersome and inefficient. A dedicated tags table with a many-to-many relationship would be more suitable for such scenarios in a larger application.
Potential for inconsistencies: Ensuring consistent formatting (e.g., no extra spaces between commas and tags) requires careful handling during data manipulation.
Conflict Detection Logic:
Currently, the refreshNotes function fetches the latest notes from the server and updates the local IndexedDB. While this ensures the local data is eventually consistent with the server, it doesn't explicitly detect conflicts arising from concurrent modifications.

My approach to detect conflicts would involve the following:

Store a last_modified timestamp: Both in the local IndexedDB record for each note and in the corresponding record on the backend. This timestamp would be updated whenever a note is modified.
During refreshNotes:
Before updating a local note with the server version, compare the last_modified timestamp of the local note with the last_modified timestamp received from the server for the same note.
If the local last_modified timestamp is more recent than the last sync time (or some other indicator of local offline modification) and the server's last_modified timestamp is also more recent than the last sync time, it indicates a potential conflict. This means both the local and server versions have been modified since the last synchronization.
Identify the specific fields that differ (e.g., title, content, tags).
Log these conflicting notes and the differing fields to the console.
Proposed Conflict Resolution Strategy:
While not implemented in the UI, my proposed conflict resolution strategy would involve:

User Notification: Inform the user that conflicts have been detected upon coming back online.
Conflict Resolution UI: Provide a specific UI for resolving these conflicts. This could include:
Displaying both the local and server versions of the conflicting note side-by-side.
Allowing the user to choose which version to keep (local or server).
Providing an option to manually merge changes from both versions (if feasible for the data structure).
Automatic Merging (with caution): For simpler conflicts (e.g., different tags added independently), an automatic merging strategy might be possible, but this needs careful consideration to avoid data loss.
Codebase Updates:

Implemented a backend using SQLite with the better-sqlite3 library to persist notes.
Created and modified API routes (/api/notes, /api/save-note, /api/edit-note, /api/delete-note) to interact with the SQLite database.
Updated the note data structure in IndexedDB to include a tags property (as an array).
Modified the NoteEditor component to allow users to add and remove tags.
Implemented a TagFilter component in NoteList to filter notes based on selected tags.
Updated the refreshNotes function in src/utils/notes.ts to fetch and synchronize tag data.
Styled the application using Tailwind CSS to improve the visual presentation and user experience.