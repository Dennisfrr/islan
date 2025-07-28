import React, { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import toast, { Toaster } from 'react-hot-toast';
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
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  PlusIcon,
  EllipsisHorizontalIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  TagIcon,
  ExclamationCircleIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  SunIcon,
  MoonIcon,
  Bars3Icon,
  XMarkIcon,
  ArrowTrendingUpIcon,
} from "@heroicons/react/24/outline";
import {
  StarIcon,
  FireIcon,
  ClockIcon,
} from "@heroicons/react/24/solid";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Avatar component for assigned users
const Avatar = ({ name, size = "sm" }) => {
  const sizeClasses = {
    xs: "w-6 h-6 text-xs",
    sm: "w-8 h-8 text-sm",
    md: "w-10 h-10 text-base",
    lg: "w-12 h-12 text-lg"
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getColor = (name) => {
    const colors = [
      "from-purple-400 to-pink-400",
      "from-blue-400 to-indigo-400", 
      "from-green-400 to-emerald-400",
      "from-yellow-400 to-orange-400",
      "from-red-400 to-rose-400",
      "from-indigo-400 to-purple-400"
    ];
    const hash = (name || "").split("").reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br ${getColor(name)} flex items-center justify-center font-semibold text-white shadow-lg`}>
      {getInitials(name)}
    </div>
  );
};

// Priority Badge Component
const PriorityBadge = ({ priority }) => {
  const config = {
    high: { color: "from-red-500 to-pink-500", icon: FireIcon, text: "Alto" },
    medium: { color: "from-yellow-500 to-orange-500", icon: ExclamationCircleIcon, text: "Médio" },
    low: { color: "from-green-500 to-emerald-500", icon: StarIcon, text: "Baixo" }
  };

  const { color, icon: Icon, text } = config[priority] || config.medium;

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r ${color} text-white text-xs font-semibold shadow-sm`}>
      <Icon className="w-3 h-3" />
      <span>{text}</span>
    </div>
  );
};

// Date Chip Component
const DateChip = ({ date }) => {
  if (!date) return null;

  const today = new Date();
  const dueDate = new Date(date);
  const diffTime = dueDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let colorClass, icon;
  if (diffDays < 0) {
    colorClass = "from-red-500 to-red-600 text-white";
    icon = <ExclamationCircleIcon className="w-3 h-3" />;
  } else if (diffDays <= 3) {
    colorClass = "from-yellow-500 to-orange-500 text-white";
    icon = <ClockIcon className="w-3 h-3" />;
  } else {
    colorClass = "from-green-500 to-emerald-500 text-white";
    icon = <CalendarIcon className="w-3 h-3" />;
  }

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r ${colorClass} text-xs font-medium shadow-sm`}>
      {icon}
      <span>{dueDate.toLocaleDateString()}</span>
    </div>
  );
};

// Progress Bar Component
const ProgressBar = ({ value }) => {
  const percentage = Math.min(Math.max(value || 0, 0), 100);
  
  return (
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 shadow-inner">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full shadow-sm"
      />
    </div>
  );
};

// Enhanced Sortable Card Component
const SortableCard = ({ card, onEdit, onDelete, isDarkMode }) => {
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
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value || 0);
  };

  const getRandomProgress = () => {
    return Math.floor(Math.random() * 100) + 1;
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: isDragging ? 0.7 : 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ 
        scale: 1.02, 
        y: -4,
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
      }}
      whileTap={{ scale: 0.98 }}
      className={`
        ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
        rounded-2xl p-5 border shadow-lg hover:shadow-xl transition-all duration-300 cursor-grab active:cursor-grabbing mb-4
        backdrop-blur-sm
      `}
    >
      <div className="flex justify-between items-start mb-3">
        <h3 className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} text-sm leading-tight line-clamp-2`}>
          {card.title}
        </h3>
        <div className="flex items-center gap-2">
          <PriorityBadge priority={card.priority} />
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(card);
            }}
            className={`p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <EllipsisHorizontalIcon className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
      
      {card.description && (
        <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} text-sm mb-4 line-clamp-2`}>
          {card.description}
        </p>
      )}

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Progresso
          </span>
          <span className={`text-xs font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            {getRandomProgress()}%
          </span>
        </div>
        <ProgressBar value={getRandomProgress()} />
      </div>

      <div className="space-y-3 text-xs">
        {card.contact_name && (
          <div className="flex items-center gap-2">
            <UserIcon className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>{card.contact_name}</span>
          </div>
        )}
        
        {card.contact_email && (
          <div className="flex items-center gap-2">
            <EnvelopeIcon className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>{card.contact_email}</span>
          </div>
        )}
        
        {card.estimated_value > 0 && (
          <div className="flex items-center gap-2">
            <CurrencyDollarIcon className="w-4 h-4 text-green-500" />
            <span className="font-bold text-green-600 dark:text-green-400">
              {formatCurrency(card.estimated_value)}
            </span>
          </div>
        )}
      </div>

      {/* Bottom Section */}
      <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2">
          {card.assigned_to && <Avatar name={card.assigned_to} size="xs" />}
          {card.due_date && <DateChip date={card.due_date} />}
        </div>
        
        {card.tags && card.tags.length > 0 && (
          <div className="flex gap-1">
            {card.tags.slice(0, 2).map((tag, index) => (
              <motion.span
                key={index}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="px-2 py-1 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 text-blue-800 dark:text-blue-200 text-xs rounded-full font-medium"
              >
                {tag}
              </motion.span>
            ))}
            {card.tags.length > 2 && (
              <span className={`px-2 py-1 ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'} text-xs rounded-full font-medium`}>
                +{card.tags.length - 2}
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Enhanced Kanban Column Component
const KanbanColumn = ({ column, cards, onAddCard, onEditCard, onDeleteCard, isDarkMode, isDragOver }) => {
  const {
    setNodeRef,
  } = useSortable({ id: column.id });

  const columnCards = cards.filter(card => card.column_id === column.id)
    .sort((a, b) => a.position - b.position);

  const getTotalValue = () => {
    return columnCards.reduce((sum, card) => sum + (card.estimated_value || 0), 0);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const columnConfig = {
    "Prospects 🎯": "from-red-100 to-pink-100 dark:from-red-900/30 dark:to-pink-900/30",
    "Contact Made 📞": "from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30",
    "Proposal Sent 📄": "from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30",
    "Closed Won 🎉": "from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30"
  };

  const bgGradient = columnConfig[column.title] || "from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`
        bg-gradient-to-br ${bgGradient} rounded-2xl p-6 min-h-96 w-80 flex-shrink-0 shadow-lg
        ${isDragOver ? 'ring-4 ring-blue-500 ring-opacity-50 scale-105' : ''}
        transition-all duration-300 backdrop-blur-sm border border-white/20
      `}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'} flex items-center gap-3`}>
            <motion.div 
              className="w-4 h-4 rounded-full shadow-lg" 
              style={{ backgroundColor: column.color }}
              whileHover={{ scale: 1.2 }}
            />
            {column.title}
          </h2>
          <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mt-1 font-medium`}>
            {columnCards.length} cards • {formatCurrency(getTotalValue())}
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => onAddCard(column.id)}
          className={`p-3 hover:bg-white/20 dark:hover:bg-gray-700/50 rounded-xl transition-all duration-200 ${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-800'} shadow-lg backdrop-blur-sm`}
        >
          <PlusIcon className="w-5 h-5" />
        </motion.button>
      </div>

      <div ref={setNodeRef} className="space-y-4">
        <SortableContext items={columnCards.map(card => card.id)} strategy={verticalListSortingStrategy}>
          <AnimatePresence>
            {columnCards.map((card) => (
              <SortableCard
                key={card.id}
                card={card}
                onEdit={onEditCard}
                onDelete={onDeleteCard}
                isDarkMode={isDarkMode}
              />
            ))}
          </AnimatePresence>
        </SortableContext>
        
        {columnCards.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className={`text-6xl mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`}>📭</div>
            <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-2`}>
              Arraste cards aqui ou
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onAddCard(column.id)}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-semibold"
            >
              Adicione um card
            </motion.button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

// Enhanced Card Modal Component
const CardModal = ({ card, isOpen, onClose, onSave, columnId, isDarkMode }) => {
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className={`
          ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
          rounded-2xl p-8 w-full max-w-2xl max-h-90vh overflow-y-auto shadow-2xl border
        `}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {card ? "✏️ Editar Card" : "➕ Novo Card"}
          </h2>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}
          >
            <XMarkIcon className="w-6 h-6" />
          </motion.button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className={`block text-sm font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-700'} mb-2`}>
              Título *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className={`
                w-full p-4 border rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all
                ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}
                text-lg font-medium
              `}
              placeholder="Ex: Acme Corp - Proposta Enterprise"
            />
          </div>

          <div>
            <label className={`block text-sm font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-700'} mb-2`}>
              Descrição
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className={`
                w-full p-4 border rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all
                ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}
              `}
              rows="3"
              placeholder="Descreva os detalhes do negócio..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={`block text-sm font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-700'} mb-2`}>
                Nome do Contato
              </label>
              <input
                type="text"
                value={formData.contact_name}
                onChange={(e) => setFormData({...formData, contact_name: e.target.value})}
                className={`
                  w-full p-4 border rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all
                  ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}
                `}
                placeholder="João Silva"
              />
            </div>

            <div>
              <label className={`block text-sm font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-700'} mb-2`}>
                Email
              </label>
              <input
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({...formData, contact_email: e.target.value})}
                className={`
                  w-full p-4 border rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all
                  ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}
                `}
                placeholder="joao@empresa.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={`block text-sm font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-700'} mb-2`}>
                Telefone
              </label>
              <input
                type="tel"
                value={formData.contact_phone}
                onChange={(e) => setFormData({...formData, contact_phone: e.target.value})}
                className={`
                  w-full p-4 border rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all
                  ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}
                `}
                placeholder="(11) 99999-9999"
              />
            </div>

            <div>
              <label className={`block text-sm font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-700'} mb-2`}>
                Valor Estimado (R$)
              </label>
              <input
                type="number"
                value={formData.estimated_value}
                onChange={(e) => setFormData({...formData, estimated_value: parseFloat(e.target.value) || 0})}
                className={`
                  w-full p-4 border rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all
                  ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}
                `}
                placeholder="25000"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className={`block text-sm font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-700'} mb-2`}>
                Prioridade
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({...formData, priority: e.target.value})}
                className={`
                  w-full p-4 border rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all
                  ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}
                `}
              >
                <option value="low">Baixa</option>
                <option value="medium">Média</option>
                <option value="high">Alta</option>
              </select>
            </div>

            <div>
              <label className={`block text-sm font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-700'} mb-2`}>
                Responsável
              </label>
              <input
                type="text"
                value={formData.assigned_to}
                onChange={(e) => setFormData({...formData, assigned_to: e.target.value})}
                className={`
                  w-full p-4 border rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all
                  ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}
                `}
                placeholder="Maria Silva"
              />
            </div>

            <div>
              <label className={`block text-sm font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-700'} mb-2`}>
                Data Limite
              </label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                className={`
                  w-full p-4 border rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all
                  ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}
                `}
              />
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={onClose}
              className={`px-6 py-3 rounded-xl font-semibold transition-all ${isDarkMode ? 'text-gray-300 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'}`}
            >
              Cancelar
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              {card ? "Atualizar Card" : "Criar Card"}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// Enhanced Analytics Dashboard Component
const AnalyticsDashboard = ({ analytics, isDarkMode }) => {
  if (!analytics) return null;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const statsCards = [
    {
      title: "Total de Cards",
      value: analytics.total_cards,
      icon: ArrowTrendingUpIcon,
      color: "from-blue-500 to-blue-600",
      bgColor: "from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20"
    },
    {
      title: "Valor do Pipeline",
      value: formatCurrency(analytics.total_pipeline_value),
      icon: CurrencyDollarIcon,
      color: "from-green-500 to-green-600",
      bgColor: "from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20"
    },
    {
      title: "Ticket Médio",
      value: formatCurrency(analytics.total_pipeline_value / Math.max(analytics.total_cards, 1)),
      icon: ArrowTrendingUpIcon,
      color: "from-orange-500 to-orange-600",
      bgColor: "from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20"
    },
    {
      title: "Etapas Ativas",
      value: Object.keys(analytics.column_stats).length,
      icon: ChartBarIcon,
      color: "from-purple-500 to-purple-600",
      bgColor: "from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20"
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl p-8 mb-8 shadow-xl border backdrop-blur-sm`}
    >
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl shadow-lg">
          <ChartBarIcon className="text-white w-6 h-6" />
        </div>
        <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          📊 Analytics do Pipeline
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statsCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`bg-gradient-to-br ${stat.bgColor} p-6 rounded-2xl shadow-lg border border-white/20`}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className={`p-3 bg-gradient-to-r ${stat.color} rounded-xl shadow-lg`}>
                <stat.icon className="text-white w-5 h-5" />
              </div>
              <span className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {stat.title}
              </span>
            </div>
            <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {stat.value}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Object.entries(analytics.column_stats).map(([columnId, stats], index) => (
          <motion.div
            key={columnId}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.15 }}
            className={`${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'} border rounded-2xl p-6 shadow-lg`}
          >
            <h3 className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4`}>
              {stats.title}
            </h3>
            <div className="space-y-3">
              <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Cards: <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats.count}</span>
              </div>
              <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Valor: <span className="font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(stats.total_value)}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
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
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Initialize app
  useEffect(() => {
    initializeApp();
    
    // Check for dark mode preference
    const darkMode = localStorage.getItem('darkMode') === 'true';
    setIsDarkMode(darkMode);
  }, []);

  const initializeApp = async () => {
    try {
      setLoading(true);
      
      // Initialize default data
      await axios.post(`${API}/initialize`);
      
      // Load data
      await loadData();
      
      toast.success('🎉 CRM carregado com sucesso!', {
        duration: 3000,
        position: 'top-right',
      });
    } catch (error) {
      console.error("Error initializing app:", error);
      toast.error('❌ Erro ao carregar CRM', {
        duration: 4000,
        position: 'top-right',
      });
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
      toast.error('❌ Erro ao carregar dados');
    }
  };

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());
    toast.success(`${newDarkMode ? '🌙' : '☀️'} Modo ${newDarkMode ? 'escuro' : 'claro'} ativado!`);
  };

  const handleDragStart = (event) => {
    const { active } = event;
    const card = cards.find(c => c.id === active.id);
    setActiveCard(card);
  };

  const handleDragOver = (event) => {
    const { over } = event;
    if (over) {
      const overColumn = columns.find(c => c.id === over.id) || 
                        columns.find(c => cards.find(card => card.id === over.id && card.column_id === c.id));
      setDragOverColumn(overColumn?.id || null);
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveCard(null);
    setDragOverColumn(null);

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

        // Show success toast
        const columnNames = {
          "Prospects 🎯": "Prospects",
          "Contact Made 📞": "Contato Feito", 
          "Proposal Sent 📄": "Proposta Enviada",
          "Closed Won 🎉": "Fechado"
        };
        
        const fromColumn = columns.find(c => c.id === activeCard.column_id);
        const toColumn = overColumn;
        
        toast.success(`🚀 ${activeCard.title} movido para ${columnNames[toColumn.title] || toColumn.title}!`, {
          duration: 3000,
          position: 'top-right',
        });

        // Reload data to reflect changes
        await loadData();
      } catch (error) {
        console.error("Error moving card:", error);
        toast.error('❌ Erro ao mover card');
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
        toast.success('✏️ Card atualizado com sucesso!');
      } else {
        // Create new card
        await axios.post(`${API}/cards`, cardData);
        toast.success('🎉 Novo card criado!');
      }

      setIsModalOpen(false);
      setEditingCard(null);
      setNewCardColumnId(null);
      await loadData();
    } catch (error) {
      console.error("Error saving card:", error);
      toast.error('❌ Erro ao salvar card');
    }
  };

  const handleDeleteCard = async (cardId) => {
    if (window.confirm("Tem certeza que deseja deletar este card?")) {
      try {
        await axios.delete(`${API}/cards/${cardId}`);
        toast.success('🗑️ Card deletado com sucesso!');
        await loadData();
      } catch (error) {
        console.error("Error deleting card:", error);
        toast.error('❌ Erro ao deletar card');
      }
    }
  };

  // Filter cards based on search term
  const filteredCards = cards.filter(card => 
    card.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (card.contact_name && card.contact_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (card.description && card.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50'} flex items-center justify-center`}>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
            🚀 Carregando seu CRM...
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-all duration-500 ${isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50'}`}>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: isDarkMode ? '#374151' : '#ffffff',
            color: isDarkMode ? '#f9fafb' : '#111827',
            borderRadius: '12px',
            border: isDarkMode ? '1px solid #4b5563' : '1px solid #e5e7eb',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          },
        }}
      />
      
      <div className="p-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <h1 className={`text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2`}>
                🎯 Sales Pipeline CRM
              </h1>
              <p className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} font-medium`}>
                Gerencie seus leads e negócios através do funil de vendas
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Search Bar */}
              <div className="relative">
                <MagnifyingGlassIcon className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                <input
                  type="text"
                  placeholder="Buscar cards..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`
                    pl-10 pr-4 py-3 w-64 rounded-xl border shadow-lg transition-all focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500
                    ${isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}
                  `}
                />
              </div>
              
              {/* Dark Mode Toggle */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleDarkMode}
                className={`p-3 rounded-xl border shadow-lg transition-all ${isDarkMode ? 'bg-gray-800 border-gray-600 text-yellow-400' : 'bg-white border-gray-300 text-gray-600'}`}
              >
                {isDarkMode ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
              </motion.button>
              
              {/* Filters Toggle */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowFilters(!showFilters)}
                className={`p-3 rounded-xl border shadow-lg transition-all ${isDarkMode ? 'bg-gray-800 border-gray-600 text-gray-300' : 'bg-white border-gray-300 text-gray-600'}`}
              >
                <FunnelIcon className="w-5 h-5" />
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Analytics Dashboard */}
        <AnalyticsDashboard analytics={analytics} isDarkMode={isDarkMode} />

        {/* Kanban Board */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-8 overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
            {columns.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                cards={filteredCards}
                onAddCard={handleAddCard}
                onEditCard={handleEditCard}
                onDeleteCard={handleDeleteCard}
                isDarkMode={isDarkMode}
                isDragOver={dragOverColumn === column.id}
              />
            ))}
          </div>

          <DragOverlay>
            {activeCard ? (
              <motion.div
                initial={{ rotate: -5, scale: 1.05 }}
                animate={{ rotate: 5, scale: 1.05 }}
                className={`
                  ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
                  rounded-2xl p-5 shadow-2xl border cursor-grabbing transform rotate-3
                `}
              >
                <h3 className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
                  {activeCard.title}
                </h3>
                <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} text-sm`}>
                  {activeCard.description}
                </p>
                <div className="flex justify-between items-center mt-3">
                  <PriorityBadge priority={activeCard.priority} />
                  {activeCard.estimated_value > 0 && (
                    <span className="font-bold text-green-600 dark:text-green-400 text-sm">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                        minimumFractionDigits: 0,
                      }).format(activeCard.estimated_value)}
                    </span>
                  )}
                </div>
              </motion.div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Card Modal */}
        <AnimatePresence>
          {isModalOpen && (
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
              isDarkMode={isDarkMode}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default App;