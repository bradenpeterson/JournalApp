import { useState } from "react";
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
    

    return (
        <div className="dashboard-container">
            <Sidebar />
            <div className="left-main-content">
                <DateNavigator selectedDate={selectedDate} onDateChange={setSelectedDate} />
                <CurrentEntryPanel selectedDate={selectedDate} />
                <OnThisDayPanel selectedDate={selectedDate} />
                <StatsPanel />
            </div>
            <div className="right-main-content">
                <QuotePanel selectedDate={selectedDate} />
                <MoodPanel selectedDate={selectedDate} />
                <Calendar selectedDate={selectedDate} onDateChange={setSelectedDate} />
            </div>
            
        </div>
    );
}
