import { useState, useMemo } from 'react';
import { getAppointmentCounts } from '../../MockData/mockAppoinmentData';
import BookNewAppointmentButton from './BookNewButton';
import BookAppointmentModal from './BookAppointmentModal';

export default function AppointmentFilterBar({
  onFilterChange,
  onAddNew,
  appointments = [],
}) {
  const [activeTab, setActiveTab] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalKey, setModalKey] = useState(0);

  // Compute counts dynamically from the appointments data so they always
  // match the mock data for every filter label.
  const counts = useMemo(
    () => getAppointmentCounts(appointments),
    [appointments]
  );

  // Tab definitions with dynamic counts
  const tabs = [
    { name: 'All', count: counts.All },
    { name: 'Scheduled', count: counts.Upcoming },
    { name: 'Completed', count: counts.Completed },
    { name: 'Waitlist', count: counts.Waitlist },
    { name: 'Cancelled', count: counts.Cancelled },
  ];

  // Determine whether the "Add New Appointment" button should be visible.
  // It is hidden for Completed and Cancelled tabs.
  const isAddButtonVisible = activeTab !== 'Completed' && activeTab !== 'Cancelled';

  const handleTabClick = (tabName) => {
    setActiveTab(tabName);
    if (onFilterChange) onFilterChange(tabName);
  };

  const handleAddNewClick = () => {
    setModalKey((k) => k + 1);
    setIsModalOpen(true);
    if (onAddNew) onAddNew();
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <div className="w-full bg-white dark:bg-slate-800 rounded-2xl p-3 md:p-3.5 border border-slate-100 dark:border-slate-700 shadow-[0_4px_20px_rgba(0,0,0,0.03)] select-none">
      {/* Status Filter Tabs + Add New Appointment Button */}
      <div className="flex items-center gap-3">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-[#f1f5f9] dark:bg-slate-700/60 p-1.5 rounded-xl overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none] flex-1 min-w-0">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.name;
            return (
              <button
                key={tab.name}
                type="button"
                onClick={() => handleTabClick(tab.name)}
                className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-bold transition-all duration-200 whitespace-nowrap flex items-center gap-1 ${
                  isActive
                    ? 'bg-[#00b0d8] text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 bg-transparent'
                }`}
              >
                <span>{tab.name}</span>
                <span>({tab.count})</span>
              </button>
            );
          })}
        </div>

        {/* Add New Appointment Button — only for non-Completed / non-Cancelled tabs */}
        {isAddButtonVisible && (
          <div className="flex-shrink-0">
            <BookNewAppointmentButton
              children="Add New Appointment"
              onClick={handleAddNewClick}
            />
          </div>
        )}
      </div>

      {/* Booking Modal */}
      <BookAppointmentModal key={modalKey} isOpen={isModalOpen} onClose={handleCloseModal} />
    </div>
  );
}
