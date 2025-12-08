# Journal App

A personal journaling web application built with React and Django. Write daily entries, track your mood, organize with tags, browse past entries, and visualize your journaling habits with stats and streaks.

## Features

- **Daily Journal Entries** - Create, edit, and delete entries
- **Calendar View** - Visual calendar with indicators for days with entries
- **Tag System** - Organize entries with custom tags and filter by them
- **Mood Tracking** - Record your mood for each day
- **Advanced Search** - Search entries by keyword, date range, tags, and mood
- **Statistics Dashboard** - Track day streak, week streak, total entries, and word count
- **On This Day** - See entries from the same date in previous years
- **User Authentication** - Secure sign-up and sign-in with session management
- **Persistent Sidebar** - Collapsible navigation with localStorage state
- **Single Page App** - Fast, smooth navigation with React Router

## Tech Stack

### Frontend
- **React** 18.x - UI library
- **React Router** 6.x - Client-side routing
- **Vite** - Fast build tool and dev server
- **CSS3** - Custom styling with CSS variables

### Backend
- **Django** 5.x - Web framework
- **Django REST Framework** - RESTful API
- **SQLite** - Database (development)
- **Python** 3.11+

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd journalapp
   ```

2. **Install Python dependencies**
   ```bash
   poetry install --no-root
   ```

3. **Install JavaScript dependencies**
   ```bash
   cd client
   npm install
   cd ..
   ```

4. **Set up environment variables**
   ```bash
   cd _server
   cp .env.example .env
   # Edit .env with your settings (SECRET_KEY, DEBUG, etc.)
   cd ..
   ```

5. **Run database migrations**
   ```bash
   cd _server
   poetry shell
   python manage.py migrate
   cd ..
   ```

6. **Create a superuser (optional)**
   ```bash
   cd _server
   python manage.py createsuperuser
   cd ..
   ```

## Running the Application

You'll need two terminal windows:

**Terminal 1 - Frontend (Vite dev server):**
```bash
cd client
npm run dev
```

**Terminal 2 - Backend (Django server):**
```bash
cd _server
poetry shell
python manage.py runserver
```

Visit **http://localhost:5173** in your browser.


## Contributing

This is a personal project, but suggestions and feedback are welcome!

## License

This project is available for educational and personal use.

## Acknowledgments

Built with the Django + Vite starter template by dittonjs.
