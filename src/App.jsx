import React, { useState, useEffect, useMemo } from 'react';
import { Trophy, Swords, Database, Plus, Trash2, UserCircle, Download, Upload } from 'lucide-react';

export default function App() {
  // Automatically inject Tailwind CSS CDN so styling works on GitHub Pages without manual setup
  useEffect(() => {
    if (!document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = 'https://cdn.tailwindcss.com';
      document.head.appendChild(script);
    }
  }, []);

  // Load profiles from LocalStorage or initialize default empty profile
  const [profiles, setProfiles] = useState(() => {
    const saved = localStorage.getItem('coasterProfiles');
    return saved ? JSON.parse(saved) : { 'My Rankings': [] };
  });

  const [activeProfile, setActiveProfile] = useState(() => {
    const saved = localStorage.getItem('coasterActiveProfile');
    return saved && profiles[saved] ? saved : 'My Rankings';
  });

  const [activeTab, setActiveTab] = useState('duel');
  const [importText, setImportText] = useState('');
  const [importStatus, setImportStatus] = useState('');
  
  // Single Coaster Form State
  const [singleName, setSingleName] = useState('');
  const [singlePark, setSinglePark] = useState('');

  const coasters = useMemo(() => profiles[activeProfile] || [], [profiles, activeProfile]);

  // Update current profile and save to LocalStorage automatically
  const updateCoasters = (newCoasters) => {
    const newProfiles = { ...profiles, [activeProfile]: newCoasters };
    setProfiles(newProfiles);
    localStorage.setItem('coasterProfiles', JSON.stringify(newProfiles));
  };

  const createProfile = () => {
    const name = prompt("Enter new profile name (e.g., 'Florida Trip 2026'):");
    if (name && !profiles[name]) {
      const newProfiles = { ...profiles, [name]: [] };
      setProfiles(newProfiles);
      setActiveProfile(name);
      localStorage.setItem('coasterProfiles', JSON.stringify(newProfiles));
      localStorage.setItem('coasterActiveProfile', name);
    }
  };

  const switchProfile = (e) => {
    const name = e.target.value;
    setActiveProfile(name);
    localStorage.setItem('coasterActiveProfile', name);
  };

  const deleteCurrentProfile = () => {
    if (Object.keys(profiles).length === 1) {
      alert("You must have at least one profile.");
      return;
    }
    if (window.confirm(`Are you sure you want to delete the profile '${activeProfile}'? All rankings inside will be lost.`)) {
      const newProfiles = { ...profiles };
      delete newProfiles[activeProfile];
      const nextProfile = Object.keys(newProfiles)[0];
      setProfiles(newProfiles);
      setActiveProfile(nextProfile);
      localStorage.setItem('coasterProfiles', JSON.stringify(newProfiles));
      localStorage.setItem('coasterActiveProfile', nextProfile);
    }
  };

  const downloadBackup = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(profiles, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "coaster_rankings_backup.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    setImportStatus('Backup downloaded successfully! Keep this file safe.');
  };

  const restoreBackup = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (typeof parsed !== 'object' || parsed === null) throw new Error("Invalid format");
        setProfiles(parsed);
        const firstProfile = Object.keys(parsed)[0] || 'Restored Profile';
        setActiveProfile(firstProfile);
        localStorage.setItem('coasterProfiles', JSON.stringify(parsed));
        localStorage.setItem('coasterActiveProfile', firstProfile);
        setImportStatus('Backup restored successfully!');
      } catch (err) {
        setImportStatus('Error restoring backup. Ensure it is a valid JSON backup file.');
      }
    };
    reader.readAsText(file);
    e.target.value = null; // reset input
  };

  const handleManualImport = () => {
    setImportStatus('Parsing HTML...');
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(importText, 'text/html');
      
      const rows = doc.querySelectorAll('table tbody tr');
      let addedCount = 0;
      let duplicateCount = 0;

      const currentNames = new Set(coasters.map(c => c.name.toLowerCase()));
      const newCoasters = [];

      rows.forEach(row => {
        const nameEl = row.querySelector('td:nth-child(1) a.text-semibold');
        const parkEl = row.querySelector('td:nth-child(1) div.text-muted');

        if (nameEl && parkEl) {
          const name = nameEl.textContent.trim();
          let park = parkEl.textContent.trim();
          park = park.replace(/^[\s\S]*?(?=[a-zA-Z0-9])/, '');

          if (!currentNames.has(name.toLowerCase())) {
            newCoasters.push({
              id: Date.now() + Math.random().toString(36).substring(2, 9),
              name,
              park,
              elo: 1200,
              matches: 0
            });
            currentNames.add(name.toLowerCase());
            addedCount++;
          } else {
            duplicateCount++;
          }
        }
      });

      if (newCoasters.length > 0) {
        updateCoasters([...coasters, ...newCoasters]);
      }

      setImportStatus(`Success! Added ${addedCount} new coasters. Ignored ${duplicateCount} duplicates.`);
      setImportText('');
    } catch (error) {
      setImportStatus(`Import failed: Check if you pasted valid HTML.`);
    }
  };

  const handleAddSingle = (e) => {
    e.preventDefault();
    if (!singleName || !singlePark) return;

    const exists = coasters.some(c => c.name.toLowerCase() === singleName.toLowerCase());
    if (exists) {
      setImportStatus(`"${singleName}" is already in your list!`);
      return;
    }

    const newCoaster = {
      id: Date.now().toString(),
      name: singleName.trim(),
      park: singlePark.trim(),
      elo: 1200,
      matches: 0
    };

    updateCoasters([...coasters, newCoaster]);
    setSingleName('');
    setSinglePark('');
    setImportStatus(`Successfully added "${newCoaster.name}"! Start dueling to rank it.`);
  };

  const getMatchup = () => {
    if (coasters.length < 2) return null;

    let a, b;
    // PRIORITY 1: Focus heavily on new additions or coasters with < 5 matches so they find their place quickly
    const newCoasters = coasters.filter(c => (c.matches || 0) < 5);

    if (newCoasters.length > 0) {
      a = newCoasters[Math.floor(Math.random() * newCoasters.length)];
      const others = coasters.filter(c => c.id !== a.id);
      b = others.reduce((closest, curr) => Math.abs(curr.elo - a.elo) < Math.abs(closest.elo - a.elo) ? curr : closest);
    } else {
      // PRIORITY 2: Focus on Top 10 precision (Top 15% tier) vs general distribution
      const rand = Math.random();
      if (rand < 0.5) {
        const sorted = [...coasters].sort((x, y) => y.elo - x.elo);
        const topCount = Math.max(2, Math.floor(sorted.length * 0.15));
        const topTier = sorted.slice(0, topCount);
        
        a = topTier[Math.floor(Math.random() * topTier.length)];
        const others = coasters.filter(c => c.id !== a.id);
        b = others.reduce((closest, curr) => Math.abs(curr.elo - a.elo) < Math.abs(closest.elo - a.elo) ? curr : closest);
      } else {
        a = coasters[Math.floor(Math.random() * coasters.length)];
        const others = coasters.filter(c => c.id !== a.id);
        b = others[Math.floor(Math.random() * others.length)];
      }
    }

    return Math.random() > 0.5 ? [a, b] : [b, a];
  };

  const currentMatch = useMemo(getMatchup, [coasters]);

  const handleVote = (winnerId) => {
    if (!currentMatch) return;

    const kFactor = 32;
    const [c1, c2] = currentMatch;
    
    const r1 = Math.pow(10, c1.elo / 400);
    const r2 = Math.pow(10, c2.elo / 400);
    
    const e1 = r1 / (r1 + r2);
    const e2 = r2 / (r1 + r2);

    const s1 = winnerId === c1.id ? 1 : 0;
    const s2 = winnerId === c2.id ? 1 : 0;

    const newElo1 = c1.elo + kFactor * (s1 - e1);
    const newElo2 = c2.elo + kFactor * (s2 - e2);

    const updated = coasters.map(c => {
      if (c.id === c1.id) return { ...c, elo: newElo1, matches: (c.matches || 0) + 1 };
      if (c.id === c2.id) return { ...c, elo: newElo2, matches: (c.matches || 0) + 1 };
      return c;
    });

    updateCoasters(updated);
  };

  const sortedCoasters = [...coasters].sort((a, b) => b.elo - a.elo);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans">
      <header className="bg-slate-800 border-b border-slate-700 shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-2xl font-bold text-sky-400">
            <Trophy className="w-8 h-8" />
            <h1>Coaster Ranker Pro</h1>
          </div>
          
          <div className="flex bg-slate-900 p-1 rounded-lg">
            <button 
              onClick={() => setActiveTab('duel')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${activeTab === 'duel' ? 'bg-sky-500 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
            >
              <Swords className="w-4 h-4" /> Duel
            </button>
            <button 
              onClick={() => setActiveTab('rankings')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${activeTab === 'rankings' ? 'bg-sky-500 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
            >
              <Trophy className="w-4 h-4" /> Rankings
            </button>
            <button 
              onClick={() => setActiveTab('data')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${activeTab === 'data' ? 'bg-sky-500 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
            >
              <Database className="w-4 h-4" /> Data & Sync
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {activeTab === 'duel' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            {coasters.length < 2 ? (
              <div className="text-center p-8 bg-slate-800 rounded-xl border border-slate-700">
                <Database className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2">Not Enough Coasters</h2>
                <p className="text-slate-400 mb-4">Go to the Data tab to add or import your coasters.</p>
                <button onClick={() => setActiveTab('data')} className="px-6 py-2 bg-sky-500 hover:bg-sky-600 rounded-lg font-semibold transition">
                  Go to Data
                </button>
              </div>
            ) : currentMatch ? (
              <div className="w-full">
                <h2 className="text-center text-3xl font-bold mb-8 text-slate-300">Which is better?</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                  <div className="hidden md:flex absolute inset-0 items-center justify-center pointer-events-none z-10">
                    <div className="bg-slate-900 border-4 border-slate-800 w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black text-sky-500 shadow-2xl">
                      VS
                    </div>
                  </div>

                  <button 
                    onClick={() => handleVote(currentMatch[0].id)}
                    className="group relative h-64 bg-slate-800 border-2 border-slate-700 hover:border-sky-500 hover:bg-slate-750 rounded-2xl p-6 flex flex-col items-center justify-center transition-all overflow-hidden shadow-xl"
                  >
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900/50" />
                    <h3 className="relative text-3xl font-bold text-center text-white mb-2 group-hover:scale-105 transition-transform">
                      {currentMatch[0].name}
                    </h3>
                    <p className="relative text-lg text-sky-400 font-medium">
                      {currentMatch[0].park}
                    </p>
                  </button>

                  <button 
                    onClick={() => handleVote(currentMatch[1].id)}
                    className="group relative h-64 bg-slate-800 border-2 border-slate-700 hover:border-sky-500 hover:bg-slate-750 rounded-2xl p-6 flex flex-col items-center justify-center transition-all overflow-hidden shadow-xl"
                  >
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900/50" />
                    <h3 className="relative text-3xl font-bold text-center text-white mb-2 group-hover:scale-105 transition-transform">
                      {currentMatch[1].name}
                    </h3>
                    <p className="relative text-lg text-sky-400 font-medium">
                      {currentMatch[1].park}
                    </p>
                  </button>
                </div>
                <p className="text-center text-slate-500 mt-8 text-sm">
                  Active Profile: {activeProfile} • Total Coasters: {coasters.length}
                </p>
              </div>
            ) : null}
          </div>
        )}

        {activeTab === 'rankings' && (
          <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
              <div>
                <h2 className="text-2xl font-bold">Leaderboard</h2>
                <p className="text-slate-400 text-sm">Profile: {activeProfile}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-400">Total Rides: <span className="font-bold text-white">{coasters.length}</span></p>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              {sortedCoasters.length === 0 ? (
                <div className="p-12 text-center text-slate-500">No coasters to rank yet.</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900/50 border-b border-slate-700 text-xs uppercase tracking-wider text-slate-400">
                      <th className="p-4 font-semibold w-16 text-center">Rank</th>
                      <th className="p-4 font-semibold">Coaster</th>
                      <th className="p-4 font-semibold">Park</th>
                      <th className="p-4 font-semibold text-right">Matches</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {sortedCoasters.map((coaster, index) => (
                      <tr key={coaster.id} className="hover:bg-slate-750 transition-colors">
                        <td className="p-4 text-center font-bold text-slate-500">#{index + 1}</td>
                        <td className="p-4 font-bold text-white text-lg">{coaster.name}</td>
                        <td className="p-4 text-slate-400">{coaster.park}</td>
                        <td className="p-4 text-right text-sm text-slate-500">
                          {coaster.matches || 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {activeTab === 'data' && (
          <div className="space-y-6">
            {importStatus && (
              <div className="p-4 bg-slate-700 border border-slate-600 rounded-lg flex items-center justify-between">
                <span className="text-sky-300 font-medium">{importStatus}</span>
                <button onClick={() => setImportStatus('')} className="text-slate-400 hover:text-white">&times;</button>
              </div>
            )}

            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl">
              <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
                <UserCircle className="w-5 h-5 text-sky-400" /> User Profiles
              </h2>
              <div className="flex flex-col sm:flex-row gap-4">
                <select 
                  className="bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-2 flex-grow focus:outline-none focus:border-sky-500"
                  value={activeProfile}
                  onChange={switchProfile}
                >
                  {Object.keys(profiles).map(name => (
                    <option key={name} value={name}>{name} ({profiles[name].length} Coasters)</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button onClick={createProfile} className="bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-lg transition-colors font-medium">
                    New Profile
                  </button>
                  <button onClick={deleteCurrentProfile} className="bg-red-900/50 hover:bg-red-600 border border-red-800 text-white px-4 py-2 rounded-lg transition-colors">
                    Delete
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl">
              <h2 className="text-xl font-bold flex items-center gap-2 mb-4 text-emerald-400">
                <Database className="w-5 h-5" /> Local Save & Backup
              </h2>
              <p className="text-sm text-slate-400 mb-6">
                Your data saves automatically to your browser. Use these tools to download a backup file to your computer.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={downloadBackup}
                  className="flex flex-1 items-center justify-center gap-2 bg-slate-700 hover:bg-emerald-600 text-white px-4 py-3 rounded-lg transition-colors font-semibold"
                >
                  <Download className="w-5 h-5" /> Download Backup (.json)
                </button>
                
                <label className="flex flex-1 items-center justify-center gap-2 bg-slate-700 hover:bg-sky-600 text-white px-4 py-3 rounded-lg transition-colors font-semibold cursor-pointer">
                  <Upload className="w-5 h-5" /> Restore Backup File
                  <input type="file" accept=".json" onChange={restoreBackup} className="hidden" />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl flex flex-col">
                <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
                  <Plus className="w-5 h-5 text-sky-400" /> Add Single Coaster
                </h2>
                <form onSubmit={handleAddSingle} className="flex flex-col gap-4 flex-grow">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Coaster Name</label>
                    <input 
                      type="text" required
                      value={singleName} onChange={e => setSingleName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-sky-500 text-white"
                      placeholder="e.g. Iron Gwazi"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Park</label>
                    <input 
                      type="text" required
                      value={singlePark} onChange={e => setSinglePark(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-sky-500 text-white"
                      placeholder="e.g. Busch Gardens Tampa"
                    />
                  </div>
                  <button type="submit" className="mt-auto bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 rounded-lg transition-colors">
                    Add to List
                  </button>
                </form>
              </div>

              <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl flex flex-col">
                <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
                  <Database className="w-5 h-5 text-sky-400" /> Import from Captain Coaster
                </h2>
                <div className="text-sm text-slate-400 mb-4 space-y-2">
                  <p><strong>Step 1:</strong> On Captain Coaster, click the <strong>"Coaster" column header</strong> to sort alphabetically (prevents skipped pages).</p>
                  <p><strong>Step 2:</strong> View Page Source on each page, copy the HTML, and paste below.</p>
                </div>
                <textarea 
                  className="w-full h-32 bg-slate-900 border border-slate-700 text-slate-300 rounded-lg p-3 focus:outline-none focus:border-sky-500 resize-none font-mono text-xs mb-4"
                  placeholder="Paste HTML source code here..."
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                />
                <button 
                  onClick={handleManualImport}
                  disabled={!importText}
                  className="mt-auto bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-2 rounded-lg transition-colors"
                >
                  Parse & Import
                </button>
              </div>
            </div>

            <div className="bg-slate-900/50 rounded-xl p-6 border border-red-900/30">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-red-400 font-bold flex items-center gap-2">
                    <Trash2 className="w-4 h-4" /> Clear Current Profile Data
                  </h3>
                  <p className="text-sm text-slate-500">This removes all coasters and Elo rankings from '{activeProfile}'.</p>
                </div>
                <button 
                  onClick={() => {
                    if(window.confirm(`Delete all ${coasters.length} coasters from ${activeProfile}? This cannot be undone.`)) {
                      updateCoasters([]);
                    }
                  }}
                  className="bg-red-900/50 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors border border-red-800"
                >
                  Wipe Data
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}