import { useState } from "react";
import Sidebar from "./Sidebar";
import CurrentEntryPanel from "./CurrentEntryPanel";
import OnThisDayPanel from "./OnThisDayPanel";
import StatsPanel from "./StatsPanel";
import MoodPanel from "./MoodPanel";
import QuotePanel from "./QuotePanel";
import Calendar from "./CalendarPanel";
import DateNavigator from "./DateNavigator";

export default function Dashboard() {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));

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
                <QuotePanel />
                <MoodPanel selectedDate={selectedDate} />
                <Calendar selectedDate={selectedDate} onDateChange={setSelectedDate} />
            </div>
        </div>
    );
}
