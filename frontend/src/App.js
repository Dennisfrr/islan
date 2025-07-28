import React, { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  useSortable,
  SortableContext as SortableContextProvider,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Plus,
  MoreHorizontal,
  User,
  Mail,
  Phone,
  DollarSign,
  Calendar,
  Tag,
  AlertCircle,
  TrendingUp,
  BarChart3,
  Target,
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Sortable Card Component
const SortableCard = ({ card, onEdit, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high": return "text-red-600 bg-red-100";
      case "medium": return "text-yellow-600 bg-yellow-100";
      case "low": return "text-green-600 bg-green-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value || 0);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white rounded-lg p-4 shadow-sm border hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing mb-3"
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-gray-900 text-sm leading-tight">
          {card.title}
        </h3>
        <div className="flex items-center gap-1">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(card.priority)}`}>
            {card.priority}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(card);
            }}
            className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
          >
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>
      
      {card.description && (
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
          {card.description}
        </p>
      )}

      <div className="space-y-2 text-xs text-gray-500">
        {card.contact_name && (
          <div className="flex items-center gap-2">
            <User size={12} />
            <span>{card.contact_name}</span>
          </div>
        )}
        {card.contact_email && (
          <div className="flex items-center gap-2">
            <Mail size={12} />
            <span>{card.contact_email}</span>
          </div>
        )}
        {card.estimated_value > 0 && (
          <div className="flex items-center gap-2 font-semibold text-green-600">
            <DollarSign size={12} />
            <span>{formatCurrency(card.estimated_value)}</span>
          </div>
        )}
        {card.due_date && (
          <div className="flex items-center gap-2">
            <Calendar size={12} />
            <span>{new Date(card.due_date).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      {card.tags && card.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {card.tags.slice(0, 2).map((tag, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
            >
              {tag}
            </span>
          ))}
          {card.tags.length > 2 && (
            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
              +{card.tags.length - 2}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// Sortable Column Component
const KanbanColumn = ({ column, cards, onAddCard, onEditCard, onDeleteCard }) => {
  const {
    setNodeRef,
  } = useSortable({ id: column.id });

  const columnCards = cards.filter(card => card.column_id === column.id)
    .sort((a, b) => a.position - b.position);

  const getTotalValue = () => {
    return columnCards.reduce((sum, card) => sum + (card.estimated_value || 0), 0);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4 min-h-96 w-80 flex-shrink-0">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: column.color }}
            />
            {column.title}
          </h2>
          <div className="text-sm text-gray-500 mt-1">
            {columnCards.length} cards • {formatCurrency(getTotalValue())}
          </div>
        </div>
        <button
          onClick={() => onAddCard(column.id)}
          className="p-2 hover:bg-gray-200 rounded-lg text-gray-500 hover:text-gray-700"
        >
          <Plus size={16} />
        </button>
      </div>

      <div ref={setNodeRef} className="space-y-3">
        <SortableContext items={columnCards.map(card => card.id)} strategy={verticalListSortingStrategy}>
          {columnCards.map((card) => (
            <SortableCard
              key={card.id}
              card={card}
              onEdit={onEditCard}
              onDelete={onDeleteCard}
            />
          ))}
        </SortableContext>
        {columnCards.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <div className="text-sm">Drop cards here or</div>
            <button
              onClick={() => onAddCard(column.id)}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium mt-1"
            >
              Add a card
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Card Modal Component
const CardModal = ({ card, isOpen, onClose, onSave, columnId }) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    estimated_value: 0,
    priority: "medium",
    assigned_to: "",
    tags: [],
    due_date: "",
  });

  useEffect(() => {
    if (card) {
      setFormData({
        title: card.title || "",
        description: card.description || "",
        contact_name: card.contact_name || "",
        contact_email: card.contact_email || "",
        contact_phone: card.contact_phone || "",
        estimated_value: card.estimated_value || 0,
        priority: card.priority || "medium",
        assigned_to: card.assigned_to || "",
        tags: card.tags || [],
        due_date: card.due_date ? card.due_date.split('T')[0] : "",
      });
    } else {
      setFormData({
        title: "",
        description: "",
        contact_name: "",
        contact_email: "",
        contact_phone: "",
        estimated_value: 0,
        priority: "medium",
        assigned_to: "",
        tags: [],
        due_date: "",
      });
    }
  }, [card]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = { ...formData };
    if (submitData.due_date) {
      submitData.due_date = new Date(submitData.due_date).toISOString();
    }
    if (!card) {
      submitData.column_id = columnId;
    }
    onSave(submitData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-90vh overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">
          {card ? "Edit Card" : "Add New Card"}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter card title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows="3"
              placeholder="Enter description"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Name
              </label>
              <input
                type="text"
                value={formData.contact_name}
                onChange={(e) => setFormData({...formData, contact_name: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="John Smith"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Email
              </label>
              <input
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({...formData, contact_email: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="john@company.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Phone
              </label>
              <input
                type="tel"
                value={formData.contact_phone}
                onChange={(e) => setFormData({...formData, contact_phone: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estimated Value ($)
              </label>
              <input
                type="number"
                value={formData.estimated_value}
                onChange={(e) => setFormData({...formData, estimated_value: parseFloat(e.target.value) || 0})}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="25000"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({...formData, priority: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {card ? "Update Card" : "Create Card"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Analytics Dashboard Component
const AnalyticsDashboard = ({ analytics }) => {
  if (!analytics) return null;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="bg-white rounded-lg p-6 mb-6 shadow-sm border">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="text-blue-600" size={20} />
        <h2 className="text-lg font-semibold text-gray-900">Pipeline Analytics</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Target className="text-blue-600" size={16} />
            <span className="text-sm text-gray-600">Total Cards</span>
          </div>
          <div className="text-2xl font-bold text-blue-600">{analytics.total_cards}</div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="text-green-600" size={16} />
            <span className="text-sm text-gray-600">Pipeline Value</span>
          </div>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(analytics.total_pipeline_value)}
          </div>
        </div>

        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="text-orange-600" size={16} />
            <span className="text-sm text-gray-600">Avg Deal Size</span>
          </div>
          <div className="text-2xl font-bold text-orange-600">
            {formatCurrency(analytics.total_pipeline_value / Math.max(analytics.total_cards, 1))}
          </div>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="text-purple-600" size={16} />
            <span className="text-sm text-gray-600">Active Stages</span>
          </div>
          <div className="text-2xl font-bold text-purple-600">
            {Object.keys(analytics.column_stats).length}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(analytics.column_stats).map(([columnId, stats]) => (
          <div key={columnId} className="border rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">{stats.title}</h3>
            <div className="space-y-1">
              <div className="text-sm text-gray-600">
                Cards: <span className="font-semibold">{stats.count}</span>
              </div>
              <div className="text-sm text-gray-600">
                Value: <span className="font-semibold text-green-600">
                  {formatCurrency(stats.total_value)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Main App Component
function App() {
  const [columns, setColumns] = useState([]);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCard, setActiveCard] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [newCardColumnId, setNewCardColumnId] = useState(null);
  const [analytics, setAnalytics] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Initialize app
  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      setLoading(true);
      
      // Initialize default data
      await axios.post(`${API}/initialize`);
      
      // Load data
      await loadData();
    } catch (error) {
      console.error("Error initializing app:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    try {
      const [boardsResponse, cardsResponse, analyticsResponse] = await Promise.all([
        axios.get(`${API}/boards`),
        axios.get(`${API}/cards`),
        axios.get(`${API}/analytics/pipeline`)
      ]);

      if (boardsResponse.data.length > 0) {
        const boardId = boardsResponse.data[0].id;
        const columnsResponse = await axios.get(`${API}/boards/${boardId}/columns`);
        setColumns(columnsResponse.data);
      }

      setCards(cardsResponse.data);
      setAnalytics(analyticsResponse.data);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const handleDragStart = (event) => {
    const { active } = event;
    const card = cards.find(c => c.id === active.id);
    setActiveCard(card);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over) return;

    const activeCard = cards.find(c => c.id === active.id);
    const overColumn = columns.find(c => c.id === over.id) || 
                      columns.find(c => cards.find(card => card.id === over.id && card.column_id === c.id));

    if (!activeCard || !overColumn) return;

    if (activeCard.column_id !== overColumn.id) {
      try {
        // Move card to new column
        await axios.post(`${API}/cards/move`, {
          card_id: activeCard.id,
          destination_column_id: overColumn.id,
          position: 0
        });

        // Reload data to reflect changes
        await loadData();
      } catch (error) {
        console.error("Error moving card:", error);
      }
    }
  };

  const handleAddCard = (columnId) => {
    setNewCardColumnId(columnId);
    setEditingCard(null);
    setIsModalOpen(true);
  };

  const handleEditCard = (card) => {
    setEditingCard(card);
    setNewCardColumnId(null);
    setIsModalOpen(true);
  };

  const handleSaveCard = async (cardData) => {
    try {
      if (editingCard) {
        // Update existing card
        await axios.put(`${API}/cards/${editingCard.id}`, cardData);
      } else {
        // Create new card
        await axios.post(`${API}/cards`, cardData);
      }

      setIsModalOpen(false);
      setEditingCard(null);
      setNewCardColumnId(null);
      await loadData();
    } catch (error) {
      console.error("Error saving card:", error);
    }
  };

  const handleDeleteCard = async (cardId) => {
    if (window.confirm("Are you sure you want to delete this card?")) {
      try {
        await axios.delete(`${API}/cards/${cardId}`);
        await loadData();
      } catch (error) {
        console.error("Error deleting card:", error);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your CRM...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Sales Pipeline CRM</h1>
          <p className="text-gray-600">Manage your leads and deals through the sales funnel</p>
        </div>

        {/* Analytics Dashboard */}
        <AnalyticsDashboard analytics={analytics} />

        {/* Kanban Board */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-6 overflow-x-auto pb-6">
            {columns.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                cards={cards}
                onAddCard={handleAddCard}
                onEditCard={handleEditCard}
                onDeleteCard={handleDeleteCard}
              />
            ))}
          </div>

          <DragOverlay>
            {activeCard ? (
              <div className="bg-white rounded-lg p-4 shadow-lg border rotate-3 transform">
                <h3 className="font-semibold text-gray-900">{activeCard.title}</h3>
                <p className="text-gray-600 text-sm mt-1">{activeCard.description}</p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Card Modal */}
        <CardModal
          card={editingCard}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingCard(null);
            setNewCardColumnId(null);
          }}
          onSave={handleSaveCard}
          columnId={newCardColumnId}
        />
      </div>
    </div>
  );
}

export default App;