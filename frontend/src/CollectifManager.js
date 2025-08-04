import React, { useState } from 'react';
import AttendanceManager from './AttendanceManager';
import MatchManager from './MatchManager';

const CollectifManager = () => {
  const [activeSubTab, setActiveSubTab] = useState('entrainement');

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Sub-navigation tabs */}
      <div className="flex justify-center mb-8">
        <div className="bg-gray-100 p-2 rounded-2xl">
          <button
            onClick={() => setActiveSubTab('entrainement')}
            className={`sub-nav-button ${
              activeSubTab === 'entrainement' 
                ? 'sub-nav-button-active' 
                : 'sub-nav-button-inactive'
            }`}
          >
            🏃‍♂️ Entrainement
          </button>
          <button
            onClick={() => setActiveSubTab('match')}
            className={`sub-nav-button ${
              activeSubTab === 'match' 
                ? 'sub-nav-button-active' 
                : 'sub-nav-button-inactive'
            }`}
          >
            🏀 Match
          </button>
        </div>
      </div>

      {/* Content based on active tab */}
      {activeSubTab === 'entrainement' && <AttendanceManager />}
      {activeSubTab === 'match' && <MatchManager />}
    </div>
  );
};

export default CollectifManager;