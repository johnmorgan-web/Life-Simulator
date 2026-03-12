import { useState, useEffect } from 'react'
import { useGame } from '../context/GameContext'

interface SaveFile {
  name: string
  timestamp: number
  isAutoSave: boolean
}

export default function SaveManager() {
  const { saveGame, loadGame, getSavesForCurrentUser, deleteSave, renameSave, newGame } = useGame()
  const [saves, setSaves] = useState<SaveFile[]>([])
  const [newSaveName, setNewSaveName] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameInput, setRenameInput] = useState('')
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [message, setMessage] = useState('')
  const [showNewGameModal, setShowNewGameModal] = useState(false)
  const [newGameName, setNewGameName] = useState('')

  useEffect(() => {
    refreshSaves()
  }, [])

  const refreshSaves = () => {
    const saves = getSavesForCurrentUser()
    setSaves(saves)
  }

  const handleNewSave = () => {
    if (!newSaveName.trim()) {
      setMessage('❌ Please enter a save name')
      return
    }

    if (saveGame(newSaveName)) {
      setMessage('✅ Save created successfully!')
      setNewSaveName('')
      setTimeout(() => {
        refreshSaves()
        setMessage('')
      }, 500)
    } else {
      setMessage('❌ Failed to create save')
    }
  }

  const handleLoadSave = (saveName: string) => {
    if (loadGame(saveName)) {
      setMessage('✅ Save loaded successfully!')
      setTimeout(() => {
        setShowSaveModal(false)
        setMessage('')
      }, 500)
    } else {
      setMessage('❌ Failed to load save')
    }
  }

  const handleDeleteSave = (saveName: string) => {
    if (saveName === '__autosave__') {
      setMessage('❌ Cannot delete autosave')
      return
    }

    if (confirm(`Are you sure you want to delete "${saveName}"?`)) {
      if (deleteSave(saveName)) {
        setMessage('✅ Save deleted')
        setTimeout(() => {
          refreshSaves()
          setMessage('')
        }, 500)
      }
    }
  }

  const handleStartRename = (saveName: string) => {
    if (saveName === '__autosave__') {
      setMessage('❌ Cannot rename autosave')
      return
    }
    setRenamingId(saveName)
    setRenameInput(saveName)
  }

  const handleConfirmRename = (oldName: string) => {
    if (!renameInput.trim() || renameInput === oldName) {
      setRenamingId(null)
      return
    }

    if (renameSave(oldName, renameInput)) {
      setMessage('✅ Save renamed')
      setRenamingId(null)
      setTimeout(() => {
        refreshSaves()
        setMessage('')
      }, 500)
    } else {
      setMessage('❌ Name already exists or rename failed')
    }
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const handleStartNewGame = () => {
    setShowNewGameModal(true)
  }

  const handleConfirmNewGame = () => {
    if (!newGameName.trim()) {
      setMessage('❌ Please enter a save name')
      return
    }

    // Start new game
    if (newGame()) {
      // Save the fresh state with the provided name
      if (saveGame(newGameName)) {
        setMessage('✅ New game started!')
        setNewGameName('')
        setShowNewGameModal(false)
        setTimeout(() => {
          refreshSaves()
          setMessage('')
        }, 500)
      } else {
        setMessage('❌ Failed to save new game')
      }
    } else {
      setMessage('❌ Failed to start new game')
    }
  }

  return (
    <>
      <button
        onClick={() => setShowSaveModal(true)}
        className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-50 text-blue-600 hover:bg-blue-100"
      >
        💾 Saves
      </button>

      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto space-y-4">
            <h3 className="font-bold text-lg">Save Manager</h3>

            {/* New Game Button */}
            <button
              onClick={handleStartNewGame}
              className="w-full px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-bold hover:from-amber-600 hover:to-orange-600 transition-all"
            >
              🆕 Start New Game
            </button>

            {/* Create New Save */}
            <div className="bg-slate-50 p-4 rounded-lg space-y-2">
              <label className="block text-sm font-bold">Create New Save</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSaveName}
                  onChange={(e) => setNewSaveName(e.target.value)}
                  placeholder="Enter save name (e.g., 'Playthrough 1')"
                  onKeyDown={(e) => e.key === 'Enter' && handleNewSave()}
                  className="flex-1 p-2 border rounded text-sm"
                />
                <button
                  onClick={handleNewSave}
                  className="px-4 py-2 bg-emerald-600 text-white rounded font-bold text-sm hover:bg-emerald-700"
                >
                  Save
                </button>
              </div>
            </div>

            {/* Save Files List */}
            <div className="space-y-2">
              <label className="block text-sm font-bold">Your Saves ({saves.length}/5)</label>
              {saves.length === 0 ? (
                <p className="text-sm text-slate-500">No saves yet. Create one above!</p>
              ) : (
                <div className="space-y-2">
                  {saves.map((save) => (
                    <div
                      key={save.name}
                      className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200"
                    >
                      <div className="flex-1">
                        {renamingId === save.name ? (
                          <input
                            type="text"
                            value={renameInput}
                            onChange={(e) => setRenameInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleConfirmRename(save.name)
                              if (e.key === 'Escape') setRenamingId(null)
                            }}
                            className="w-full p-2 border rounded text-sm font-bold"
                            autoFocus
                          />
                        ) : (
                          <>
                            <p className="font-bold text-sm">
                              {save.isAutoSave ? '🔄 Autosave' : save.name}
                            </p>
                            <p className="text-xs text-slate-500">{formatDate(save.timestamp)}</p>
                          </>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleLoadSave(save.name)}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700"
                        >
                          Load
                        </button>
                        {!save.isAutoSave && (
                          <>
                            {renamingId === save.name ? (
                              <>
                                <button
                                  onClick={() => handleConfirmRename(save.name)}
                                  className="px-3 py-1 bg-emerald-600 text-white rounded text-xs font-bold hover:bg-emerald-700"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={() => setRenamingId(null)}
                                  className="px-3 py-1 bg-slate-400 text-white rounded text-xs font-bold hover:bg-slate-500"
                                >
                                  ✕
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleStartRename(save.name)}
                                  className="px-3 py-1 bg-amber-600 text-white rounded text-xs font-bold hover:bg-amber-700"
                                >
                                  Rename
                                </button>
                                <button
                                  onClick={() => handleDeleteSave(save.name)}
                                  className="px-3 py-1 bg-rose-600 text-white rounded text-xs font-bold hover:bg-rose-700"
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Message */}
            {message && (
              <div className={`p-3 rounded-lg text-sm text-center ${message.includes('✅') ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                {message}
              </div>
            )}

            {/* Close Button */}
            <button
              onClick={() => setShowSaveModal(false)}
              className="w-full px-4 py-2 bg-slate-200 text-slate-800 rounded font-bold hover:bg-slate-300"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* New Game Modal */}
      {showNewGameModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 space-y-4">
            <h3 className="font-bold text-lg">Start New Game</h3>
            <p className="text-sm text-slate-600">
              This will start a fresh game. Your current progress will not be affected unless you overwrite a save.
            </p>

            <div className="space-y-2">
              <label className="block text-sm font-bold">Save Name (Optional)</label>
              <input
                type="text"
                value={newGameName}
                onChange={(e) => setNewGameName(e.target.value)}
                placeholder="e.g., 'Conservative Run'"
                onKeyDown={(e) => e.key === 'Enter' && handleConfirmNewGame()}
                className="w-full p-2 border rounded text-sm"
                autoFocus
              />
              <p className="text-xs text-slate-500">Leave empty to start without saving immediately</p>
            </div>

            {message && (
              <div className={`p-3 rounded-lg text-sm text-center ${message.includes('✅') ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                {message}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleConfirmNewGame}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded font-bold hover:bg-orange-700"
              >
                Start Game
              </button>
              <button
                onClick={() => {
                  setShowNewGameModal(false)
                  setNewGameName('')
                  setMessage('')
                }}
                className="flex-1 px-4 py-2 bg-slate-200 text-slate-800 rounded font-bold hover:bg-slate-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
