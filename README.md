# Journal App

A personal journaling web application built with React and Django. Write daily entries, track your mood, organize with tags, browse past entries, and visualize your journaling habits with stats and streaks.

![Journal App](https://img.shields.io/badge/React-18.x-61dafb?logo=react) ![Django](https://img.shields.io/badge/Django-5.x-092e20?logo=django) ![DRF](https://img.shields.io/badge/DRF-3.x-ff1709?logo=django)

## Features

### Core Functionality
- 📝 **Daily Journal Entries** - Create, edit, and delete entries with rich text content
- 📅 **Calendar View** - Visual calendar with indicators for days with entries
- 🏷️ **Tag System** - Organize entries with custom tags and filter by them
- 😊 **Mood Tracking** - Record your mood for each day (5-point scale)
- 🔍 **Advanced Search** - Search entries by keyword, date range, tags, and mood
- 📊 **Statistics Dashboard** - Track day streak, week streak, total entries, and word count
- 🗓️ **On This Day** - See entries from the same date in previous years
- ♾️ **Infinite Scroll** - Browse all entries and search results seamlessly

### User Experience
- 🎨 **Clean Cream & Sage Design** - Calming, journal-like aesthetic with serif headings
- 📱 **Responsive Layout** - Optimized for desktop and mobile devices
- 🔐 **User Authentication** - Secure sign-up and sign-in with session management
- 🌐 **Single Page App** - Fast, smooth navigation with React Router
- 💾 **Persistent Sidebar** - Collapsible navigation with localStorage state

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

### Prerequisites
- Python 3.11 or higher
- Node.js 18+ and npm
- Poetry (Python dependency manager)

### Setup

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
   poetry shell  # or use 'poetry run' prefix
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

## Project Structure

```
journalapp/
├── _server/              # Django backend
│   ├── _server/          # Project settings
│   ├── core/             # Main app (views, models, serializers)
│   ├── registration/     # Authentication app
│   ├── manage.py
│   └── db.sqlite3
├── client/               # React frontend
│   ├── src/
│   │   ├── api/          # API client functions
│   │   ├── components/   # React components
│   │   ├── pages/        # Page-level components
│   │   ├── utils/        # Utility functions (date helpers)
│   │   ├── App.jsx       # Main app component
│   │   ├── index.css     # Global styles
│   │   └── main.jsx      # Entry point
│   ├── public/
│   ├── package.json
│   └── vite.config.js
├── pyproject.toml        # Python dependencies
└── README.md
```

## API Endpoints

### Journal Entries
- `GET /api/entries/` - List entries (supports filtering)
- `POST /api/entries/` - Create entry
- `GET /api/entries/{id}/` - Get entry detail
- `PUT /api/entries/{id}/` - Update entry
- `DELETE /api/entries/{id}/` - Delete entry
- `GET /api/entries/stats/` - Get user statistics

**Query Parameters:**
- `search` - Keyword search in title/content
- `date` - Filter by specific date (YYYY-MM-DD)
- `start_date`, `end_date` - Date range filter
- `tags` - Filter by tag IDs (comma-separated)
- `mood` - Filter by mood value (1-5)
- `month_day` - Filter by month-day (MM-DD) for "On This Day"

### Tags
- `GET /api/tags/` - List all user tags
- `POST /api/tags/` - Create tag
- `GET /api/tags/{id}/` - Get tag detail
- `PUT /api/tags/{id}/` - Update tag
- `DELETE /api/tags/{id}/` - Delete tag

### Moods
- `GET /api/moods/` - List moods (filter by `?date=YYYY-MM-DD`)
- `POST /api/moods/` - Create/update mood for date
- `GET /api/moods/{id}/` - Get mood detail
- `DELETE /api/moods/{id}/` - Delete mood

## Development

### Useful Commands

**Backend:**
```bash
# Run tests
python manage.py test

# Create migrations
python manage.py makemigrations

# Django shell
python manage.py shell

# Backfill word counts (if needed)
python manage.py backfill_word_counts
```

**Frontend:**
```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## Design Philosophy

- **Calm & Focused** - Cream and sage color palette creates a peaceful writing environment
- **Date-Centric** - Calendar and date navigation put temporal context first
- **Low Friction** - Auto-growing text areas, keyboard shortcuts, and smooth navigation
- **Privacy First** - All entries are private to the authenticated user

## Contributing

This is a personal project, but suggestions and feedback are welcome!

## License

This project is available for educational and personal use.

## Acknowledgments

Built with the Django + Vite starter template by dittonjs.
