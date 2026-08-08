import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const POSITIONS = ['Arrière', 'Ailier', 'Intérieur'];

const emptyExerciseForm = {
  name: '',
  category: '',
  positions: [],
  objective: '',
  duration_minutes: '',
  equipment: '', // texte, séparé par des virgules à la saisie
  player_count: '',
  steps: '',
  key_instructions: '',
  notes: '',
  variants: '',
  diagram: '',
  video_url: ''
};

const ExerciseLibrary = () => {
  const [categories, setCategories] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all'); // 'all' ou nom de catégorie
  const [selectedPosition, setSelectedPosition] = useState('all'); // 'all' ou 'Arrière'/'Ailier'/'Intérieur'
  const [loading, setLoading] = useState(false);

  const [showExerciseForm, setShowExerciseForm] = useState(false);
  const [editingExercise, setEditingExercise] = useState(null);
  const [exerciseForm, setExerciseForm] = useState(emptyExerciseForm);

  const [selectedExercise, setSelectedExercise] = useState(null); // pour la vue détail

  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState(null); // { id, name }

  useEffect(() => {
    fetchCategories();
    fetchExercises();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/exercise-categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des catégories:', error);
    }
  };

  const fetchExercises = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/exercises`);
      setExercises(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des exercices:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- Catégories ---
  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      await axios.post(`${API}/exercise-categories`, { name: newCategoryName.trim() });
      setNewCategoryName('');
      setShowCategoryForm(false);
      fetchCategories();
    } catch (error) {
      console.error('Erreur lors de la création de la catégorie:', error);
    }
  };

  const handleRenameCategory = async (e) => {
    e.preventDefault();
    if (!editingCategory || !editingCategory.name.trim()) return;
    try {
      await axios.put(`${API}/exercise-categories/${editingCategory.id}`, { name: editingCategory.name.trim() });
      setEditingCategory(null);
      fetchCategories();
      fetchExercises();
    } catch (error) {
      console.error('Erreur lors du renommage de la catégorie:', error);
    }
  };

  const handleDeleteCategory = async (category) => {
    if (!window.confirm(`Supprimer la catégorie "${category.name}" ? Les exercices existants garderont ce nom de catégorie mais elle disparaîtra de la liste.`)) return;
    try {
      await axios.delete(`${API}/exercise-categories/${category.id}`);
      if (selectedCategory === category.name) setSelectedCategory('all');
      fetchCategories();
    } catch (error) {
      console.error('Erreur lors de la suppression de la catégorie:', error);
    }
  };

  // --- Exercices ---
  const openNewExerciseForm = () => {
    setEditingExercise(null);
    setExerciseForm({
      ...emptyExerciseForm,
      category: selectedCategory !== 'all' ? selectedCategory : (categories[0]?.name || '')
    });
    setShowExerciseForm(true);
  };

  const openEditExerciseForm = (exercise) => {
    setEditingExercise(exercise);
    setExerciseForm({
      name: exercise.name || '',
      category: exercise.category || '',
      positions: exercise.positions || [],
      objective: exercise.objective || '',
      duration_minutes: exercise.duration_minutes ?? '',
      equipment: (exercise.equipment || []).join(', '),
      player_count: exercise.player_count || '',
      steps: exercise.steps || '',
      key_instructions: exercise.key_instructions || '',
      notes: exercise.notes || '',
      variants: exercise.variants || '',
      diagram: exercise.diagram || '',
      video_url: exercise.video_url || ''
    });
    setShowExerciseForm(true);
    setSelectedExercise(null);
  };

  const handleDiagramChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setExerciseForm(prev => ({ ...prev, diagram: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePositionToggle = (position) => {
    setExerciseForm(prev => ({
      ...prev,
      positions: prev.positions.includes(position)
        ? prev.positions.filter(p => p !== position)
        : [...prev.positions, position]
    }));
  };

  const handleExerciseSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: exerciseForm.name,
        category: exerciseForm.category || null,
        positions: exerciseForm.positions || [],
        objective: exerciseForm.objective || null,
        duration_minutes: exerciseForm.duration_minutes ? parseInt(exerciseForm.duration_minutes, 10) : null,
        equipment: exerciseForm.equipment
          ? exerciseForm.equipment.split(',').map(s => s.trim()).filter(Boolean)
          : [],
        player_count: exerciseForm.player_count || null,
        steps: exerciseForm.steps || null,
        key_instructions: exerciseForm.key_instructions || null,
        notes: exerciseForm.notes || null,
        variants: exerciseForm.variants || null,
        diagram: exerciseForm.diagram || null,
        video_url: exerciseForm.video_url || null
      };

      if (editingExercise) {
        await axios.put(`${API}/exercises/${editingExercise.id}`, payload);
      } else {
        await axios.post(`${API}/exercises`, payload);
      }
      setShowExerciseForm(false);
      setEditingExercise(null);
      setExerciseForm(emptyExerciseForm);
      fetchExercises();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de l\'exercice:', error);
      alert("Une erreur est survenue lors de l'enregistrement de l'exercice.");
    }
  };

  const handleDeleteExercise = async (exercise) => {
    if (!window.confirm(`Supprimer l'exercice "${exercise.name}" ?`)) return;
    try {
      await axios.delete(`${API}/exercises/${exercise.id}`);
      setSelectedExercise(null);
      fetchExercises();
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'exercice:', error);
    }
  };

  const filteredExercises = exercises.filter(ex => {
    const matchesCategory = selectedCategory === 'all' || ex.category === selectedCategory;
    const matchesPosition = selectedPosition === 'all' || (ex.positions || []).includes(selectedPosition);
    return matchesCategory && matchesPosition;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">📚 Bibliothèque d'exercices</h1>
        <button
          onClick={openNewExerciseForm}
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl transition-colors font-semibold"
        >
          + Nouvel exercice
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar catégories */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-gray-800">Catégories</h3>
              <button
                onClick={() => setShowCategoryForm(!showCategoryForm)}
                className="text-blue-600 hover:text-blue-800 text-sm font-semibold"
              >
                + Ajouter
              </button>
            </div>

            {showCategoryForm && (
              <form onSubmit={handleAddCategory} className="mb-3 flex space-x-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Nom de la catégorie"
                  className="flex-1 p-2 border border-gray-300 rounded-lg text-sm"
                  autoFocus
                />
                <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white px-3 rounded-lg text-sm">
                  OK
                </button>
              </form>
            )}

            <button
              onClick={() => setSelectedCategory('all')}
              className={`w-full text-left px-3 py-2 rounded-lg mb-1 text-sm font-medium transition-colors ${
                selectedCategory === 'all' ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              Tous les exercices
              <span className="text-gray-400 ml-1">({exercises.length})</span>
            </button>

            {categories.map(cat => (
              <div key={cat.id} className="group">
                {editingCategory?.id === cat.id ? (
                  <form onSubmit={handleRenameCategory} className="flex space-x-1 mb-1">
                    <input
                      type="text"
                      value={editingCategory.name}
                      onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                      className="flex-1 p-1.5 border border-gray-300 rounded-lg text-sm"
                      autoFocus
                    />
                    <button type="submit" className="text-green-600 text-sm px-1">✓</button>
                    <button type="button" onClick={() => setEditingCategory(null)} className="text-gray-400 text-sm px-1">✕</button>
                  </form>
                ) : (
                  <div
                    className={`flex items-center justify-between px-3 py-2 rounded-lg mb-1 text-sm font-medium cursor-pointer transition-colors ${
                      selectedCategory === cat.name ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <span onClick={() => setSelectedCategory(cat.name)} className="flex-1">
                      {cat.name}
                      <span className="text-gray-400 ml-1">
                        ({exercises.filter(ex => ex.category === cat.name).length})
                      </span>
                    </span>
                    <span className="hidden group-hover:flex space-x-1">
                      <button
                        onClick={() => setEditingCategory({ id: cat.id, name: cat.name })}
                        className="text-gray-400 hover:text-blue-600 text-xs px-1"
                        title="Renommer"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat)}
                        className="text-gray-400 hover:text-red-600 text-xs px-1"
                        title="Supprimer"
                      >
                        🗑️
                      </button>
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Liste des exercices */}
        <div className="lg:col-span-3">
          {/* Filtre par poste */}
          <div className="bg-white rounded-2xl shadow-lg p-4 mb-4 flex items-center flex-wrap gap-2">
            <span className="text-sm font-medium text-gray-600 mr-1">Poste :</span>
            <button
              onClick={() => setSelectedPosition('all')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedPosition === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Tous
            </button>
            {POSITIONS.map(position => (
              <button
                key={position}
                onClick={() => setSelectedPosition(position)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedPosition === position ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {position}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="loading-spinner"></div>
              <span className="ml-3 text-gray-600">Chargement...</span>
            </div>
          ) : filteredExercises.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center text-gray-500">
              Aucun exercice pour l'instant. Clique sur "+ Nouvel exercice" pour commencer.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredExercises.map(exercise => (
                <div
                  key={exercise.id}
                  onClick={() => setSelectedExercise(exercise)}
                  className="bg-white rounded-2xl shadow-lg p-5 cursor-pointer hover:shadow-xl transition-shadow"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-gray-800">{exercise.name}</h4>
                    {exercise.duration_minutes ? (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full whitespace-nowrap ml-2">
                        {exercise.duration_minutes} min
                      </span>
                    ) : null}
                  </div>
                  {exercise.category && (
                    <span className="inline-block text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full mb-2 mr-1">
                      {exercise.category}
                    </span>
                  )}
                  {(exercise.positions || []).map(pos => (
                    <span key={pos} className="inline-block text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full mb-2 mr-1">
                      {pos}
                    </span>
                  ))}
                  {exercise.objective && (
                    <p className="text-gray-600 text-sm line-clamp-2">{exercise.objective}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Vue détail d'un exercice */}
      {selectedExercise && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedExercise(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold text-gray-800">{selectedExercise.name}</h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => openEditExerciseForm(selectedExercise)}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-sm"
                >
                  ✏️ Modifier
                </button>
                <button
                  onClick={() => handleDeleteExercise(selectedExercise)}
                  className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded-lg text-sm"
                >
                  🗑️
                </button>
                <button
                  onClick={() => setSelectedExercise(null)}
                  className="text-gray-400 hover:text-gray-600 px-2 text-xl"
                >
                  ✕
                </button>
              </div>
            </div>

            {selectedExercise.diagram && (
              <img src={selectedExercise.diagram} alt="Schéma de l'exercice" className="w-full rounded-xl mb-4 border border-gray-200" />
            )}

            <div className="space-y-3">
              {selectedExercise.category && (
                <DetailRow label="Catégorie" value={<span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-sm">{selectedExercise.category}</span>} />
              )}
              {selectedExercise.positions && selectedExercise.positions.length > 0 && (
                <DetailRow
                  label="Postes"
                  value={
                    <div className="flex flex-wrap gap-1">
                      {selectedExercise.positions.map(pos => (
                        <span key={pos} className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-sm">{pos}</span>
                      ))}
                    </div>
                  }
                />
              )}
              {selectedExercise.objective && <DetailRow label="Objectif" value={selectedExercise.objective} />}
              {selectedExercise.duration_minutes ? <DetailRow label="Durée" value={`${selectedExercise.duration_minutes} min`} /> : null}
              {selectedExercise.player_count && <DetailRow label="Nombre de joueurs" value={selectedExercise.player_count} />}
              {selectedExercise.equipment && selectedExercise.equipment.length > 0 && (
                <DetailRow
                  label="Matériel"
                  value={
                    <div className="flex flex-wrap gap-1">
                      {selectedExercise.equipment.map((item, i) => (
                        <span key={i} className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-sm">{item}</span>
                      ))}
                    </div>
                  }
                />
              )}
              {selectedExercise.steps && <DetailRow label="Étape / Organisation" value={selectedExercise.steps} multiline />}
              {selectedExercise.key_instructions && <DetailRow label="Consignes clés" value={selectedExercise.key_instructions} multiline />}
              {selectedExercise.variants && <DetailRow label="Variantes" value={selectedExercise.variants} multiline />}
              {selectedExercise.notes && <DetailRow label="Notes" value={selectedExercise.notes} multiline />}
              {selectedExercise.video_url && (
                <DetailRow
                  label="Vidéo"
                  value={<a href={selectedExercise.video_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{selectedExercise.video_url}</a>}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Formulaire ajout / édition */}
      {showExerciseForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              {editingExercise ? "Modifier l'exercice" : 'Nouvel exercice'}
            </h2>
            <form onSubmit={handleExerciseSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'exercice *</label>
                <input
                  type="text"
                  required
                  value={exerciseForm.name}
                  onChange={(e) => setExerciseForm({ ...exerciseForm, name: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
                  <select
                    value={exerciseForm.category}
                    onChange={(e) => setExerciseForm({ ...exerciseForm, category: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Aucune</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Durée (min)</label>
                  <input
                    type="number"
                    min="0"
                    value={exerciseForm.duration_minutes}
                    onChange={(e) => setExerciseForm({ ...exerciseForm, duration_minutes: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Postes concernés</label>
                <div className="flex flex-wrap gap-3 border border-gray-300 rounded-xl p-3">
                  {POSITIONS.map(position => (
                    <label key={position} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={exerciseForm.positions.includes(position)}
                        onChange={() => handlePositionToggle(position)}
                        className="rounded text-blue-600"
                      />
                      <span className="text-sm">{position}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">Laisse tout décoché si l'exercice concerne tous les postes.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Objectif</label>
                <input
                  type="text"
                  value={exerciseForm.objective}
                  onChange={(e) => setExerciseForm({ ...exerciseForm, objective: e.target.value })}
                  placeholder="Ex : Être capable de se créer son espace de tir"
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de joueurs</label>
                  <input
                    type="text"
                    value={exerciseForm.player_count}
                    onChange={(e) => setExerciseForm({ ...exerciseForm, player_count: e.target.value })}
                    placeholder="Ex : 4 à 6"
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Matériel (séparé par des virgules)</label>
                  <input
                    type="text"
                    value={exerciseForm.equipment}
                    onChange={(e) => setExerciseForm({ ...exerciseForm, equipment: e.target.value })}
                    placeholder="Ex : Plots, chasubles"
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Étape / Organisation</label>
                <textarea
                  value={exerciseForm.steps}
                  onChange={(e) => setExerciseForm({ ...exerciseForm, steps: e.target.value })}
                  rows={4}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Consignes clés</label>
                <textarea
                  value={exerciseForm.key_instructions}
                  onChange={(e) => setExerciseForm({ ...exerciseForm, key_instructions: e.target.value })}
                  rows={2}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Variantes</label>
                <textarea
                  value={exerciseForm.variants}
                  onChange={(e) => setExerciseForm({ ...exerciseForm, variants: e.target.value })}
                  rows={2}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={exerciseForm.notes}
                  onChange={(e) => setExerciseForm({ ...exerciseForm, notes: e.target.value })}
                  rows={2}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lien vidéo</label>
                <input
                  type="url"
                  value={exerciseForm.video_url}
                  onChange={(e) => setExerciseForm({ ...exerciseForm, video_url: e.target.value })}
                  placeholder="https://youtube.com/..."
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Schéma (image)</label>
                <input type="file" accept="image/*" onChange={handleDiagramChange} className="w-full text-sm" />
                {exerciseForm.diagram && (
                  <img src={exerciseForm.diagram} alt="Aperçu du schéma" className="mt-2 max-h-40 rounded-xl border border-gray-200" />
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowExerciseForm(false); setEditingExercise(null); }}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-xl transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl transition-colors font-semibold"
                >
                  {editingExercise ? 'Enregistrer' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const DetailRow = ({ label, value, multiline }) => (
  <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-2 border-b border-gray-100">
    <span className="text-gray-500 text-sm font-medium sm:w-40 flex-shrink-0">{label}</span>
    <span className={`text-gray-800 ${multiline ? 'whitespace-pre-line' : ''}`}>{value}</span>
  </div>
);

export default ExerciseLibrary;
