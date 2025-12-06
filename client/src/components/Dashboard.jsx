import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Sidebar from "./Sidebar";
import CurrentEntryPanel from "./CurrentEntryPanel";
import OnThisDayPanel from "./OnThisDayPanel";
import StatsPanel from "./StatsPanel";
import MoodPanel from "./MoodPanel";
import QuotePanel from "./QuotePanel";
import Calendar from "./CalendarPanel";
import DateNavigator from "./DateNavigator";

export default function Dashboard() {
    // Use local date (YYYY-MM-DD) to avoid timezone differences with toISOString
    function localISODate(d = new Date()) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    const [searchParams] = useSearchParams();
    const initialDate = searchParams.get('date') || localISODate();
    const [selectedDate, setSelectedDate] = useState(initialDate);
    const [tagRefreshKey, setTagRefreshKey] = useState(0);
    
    // Initialize sidebar state from localStorage, default to true
    const [sidebarOpen, setSidebarOpen] = useState(() => {
        const saved = localStorage.getItem('sidebarOpen');
        return saved !== null ? JSON.parse(saved) : true;
    });

    // Persist sidebar state to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('sidebarOpen', JSON.stringify(sidebarOpen));
    }, [sidebarOpen]);

    return (
        <div className="dashboard-container">
            <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
            <div className={`main-area ${sidebarOpen ? '' : 'main-area-expanded'}`}>
                <div className="top-row">
                    <div className="date-nav-area">
                        <DateNavigator selectedDate={selectedDate} onDateChange={setSelectedDate} onTagApplied={() => setTagRefreshKey(k => k + 1)} />
                    </div>
                    <div className="quote-area">
                        <QuotePanel selectedDate={selectedDate} />
                    </div>
                </div>

                <div className="content-columns">
                    <div className="left-main-content">
                        <CurrentEntryPanel selectedDate={selectedDate} tagRefreshKey={tagRefreshKey} />
                        <OnThisDayPanel selectedDate={selectedDate} />
                        <StatsPanel />
                    </div>
                    <div className="right-main-content">
                        <MoodPanel selectedDate={selectedDate} />
                        <Calendar selectedDate={selectedDate} onDateChange={setSelectedDate} />
                    </div>
                </div>
            </div>
        </div>
    );
}
