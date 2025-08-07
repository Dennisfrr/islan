import React, { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import toast, { Toaster } from 'react-hot-toast';
import QRCode from 'react-qr-code';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
  ChatBubbleLeftRightIcon,
  CogIcon,
  SignalIcon,
  CheckCircleIcon,
  ClockIcon as ClockIconOutline,
  ExclamationTriangleIcon,
  DevicePhoneMobileIcon,
} from "@heroicons/react/24/outline";
import {
  StarIcon,
  FireIcon,
  ClockIcon,
  ChatBubbleLeftIcon,
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
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${color} text-white shadow-sm`}>
      <Icon className="w-3 h-3" />
      {text}
    </div>
  );
};

// Platform Status Badge Component
const PlatformStatus = ({ platform, status, lastActivity }) => {
  const platformConfig = {
    whatsapp: { 
      name: "WhatsApp", 
      color: "bg-green-500", 
      icon: "💬",
      bgColor: "bg-green-50"
    },
    messenger: { 
      name: "Messenger", 
      color: "bg-blue-500", 
      icon: "📧",
      bgColor: "bg-blue-50"
    },
    email: { 
      name: "Email", 
      color: "bg-purple-500", 
      icon: "✉️",
      bgColor: "bg-purple-50"
    }
  };

  const config = platformConfig[platform] || platformConfig.whatsapp;
  const statusColor = status === 'connected' ? 'bg-green-500' : 
                     status === 'configured' ? 'bg-yellow-500' : 'bg-gray-400';

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${config.bgColor} border`}>
      <span className="text-lg">{config.icon}</span>
      <div className="flex flex-col">
        <span className="text-sm font-medium text-gray-800">{config.name}</span>
        {lastActivity && (
          <span className="text-xs text-gray-500">
            {formatDistanceToNow(new Date(lastActivity), { addSuffix: true, locale: ptBR })}
          </span>
        )}
      </div>
      <div className={`w-3 h-3 rounded-full ${statusColor}`}></div>
    </div>
  );
};

// Communication Message Component
const MessageItem = ({ message, isLast }) => {
  const isIncoming = message.direction === 'incoming';
  const platformIcons = {
    whatsapp: "💬",
    messenger: "📧", 
    email: "✉️"
  };

  return (
    <div className={`flex ${isIncoming ? 'justify-start' : 'justify-end'} mb-3`}>
      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
        isIncoming 
          ? 'bg-gray-100 text-gray-800' 
          : 'bg-blue-500 text-white'
      } shadow-sm`}>
        {isIncoming && (
          <div className="flex items-center gap-1 mb-1">
            <span className="text-sm">{platformIcons[message.channel]}</span>
            <span className="text-xs text-gray-500">{message.channel}</span>
            {message.automated_response && (
              <span className="text-xs bg-green-100 text-green-800 px-1 rounded">Auto</span>
            )}
          </div>
        )}
        <p className="text-sm">{message.content}</p>
        <div className={`flex items-center gap-2 mt-1 ${
          isIncoming ? 'text-gray-500' : 'text-blue-100'
        } text-xs`}>
          <span>{formatDistanceToNow(new Date(message.timestamp), { addSuffix: true, locale: ptBR })}</span>
          {message.intent && (
            <span className="bg-purple-100 text-purple-800 px-1 rounded">
              {message.intent}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// Enhanced Card Component with Communication History
const Card = ({ card, onEdit, onDelete, communications = [] }) => {
  const [showCommunications, setShowCommunications] = useState(false);
  const [cardCommunications, setCardCommunications] = useState([]);
  
  useEffect(() => {
    // Filter communications for this card
    const filtered = communications.filter(comm => comm.card_id === card.id);
    setCardCommunications(filtered.slice(0, 5)); // Show last 5 messages
  }, [communications, card.id]);

  const lastCommunication = cardCommunications[0];
  const hasRecentActivity = lastCommunication && 
    new Date() - new Date(lastCommunication.timestamp) < 24 * 60 * 60 * 1000; // Last 24h

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all duration-200 group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-900 mb-1 leading-tight">
            {card.title}
          </h3>
          {hasRecentActivity && (
            <div className="flex items-center gap-1 mb-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-600 font-medium">Ativo agora</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          {cardCommunications.length > 0 && (
            <button
              onClick={() => setShowCommunications(!showCommunications)}
              className="p-1 hover:bg-gray-100 rounded-md transition-colors"
              title={`${cardCommunications.length} mensagens`}
            >
              <ChatBubbleLeftIcon className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-blue-500 ml-1">{cardCommunications.length}</span>
            </button>
          )}
          <button
            onClick={() => onEdit(card)}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 rounded-md transition-all"
          >
            <EllipsisHorizontalIcon className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {card.description && (
        <p className="text-xs text-gray-600 mb-3 line-clamp-2">
          {card.description}
        </p>
      )}

      {/* Contact Information */}
      {(card.contact_name || card.contact_phone || card.contact_email) && (
        <div className="space-y-1 mb-3">
          {card.contact_name && (
            <div className="flex items-center gap-2">
              <UserIcon className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-700">{card.contact_name}</span>
            </div>
          )}
          {card.contact_phone && (
            <div className="flex items-center gap-2">
              <PhoneIcon className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-700">{card.contact_phone}</span>
            </div>
          )}
          {card.contact_email && (
            <div className="flex items-center gap-2">
              <EnvelopeIcon className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-700 truncate">{card.contact_email}</span>
            </div>
          )}
        </div>
      )}

      {/* Communication History Preview */}
      {showCommunications && cardCommunications.length > 0 && (
        <div className="border-t pt-3 mb-3 max-h-40 overflow-y-auto">
          <h4 className="text-xs font-medium text-gray-700 mb-2">Últimas Conversas</h4>
          {cardCommunications.map((comm) => (
            <div key={comm.id} className="mb-2 last:mb-0">
              <div className={`text-xs p-2 rounded ${
                comm.direction === 'incoming' 
                  ? 'bg-gray-50 text-gray-700' 
                  : 'bg-blue-50 text-blue-700'
              }`}>
                <div className="flex items-center gap-1 mb-1">
                  <span>{comm.channel === 'whatsapp' ? '💬' : '📧'}</span>
                  <span className="font-medium">{comm.direction === 'incoming' ? 'Cliente' : 'Você'}</span>
                  {comm.automated_response && (
                    <span className="bg-green-100 text-green-700 px-1 rounded text-xs">Auto</span>
                  )}
                </div>
                <p className="line-clamp-2">{comm.content}</p>
                <span className="text-gray-500 text-xs">
                  {formatDistanceToNow(new Date(comm.timestamp), { addSuffix: true, locale: ptBR })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Card Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PriorityBadge priority={card.priority} />
          {card.estimated_value > 0 && (
            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <CurrencyDollarIcon className="w-3 h-3" />
              R$ {card.estimated_value.toLocaleString('pt-BR')}
            </div>
          )}
        </div>
        {lastCommunication && (
          <div className="text-xs text-gray-500">
            {lastCommunication.channel === 'whatsapp' ? '💬' : '📧'}
            {formatDistanceToNow(new Date(lastCommunication.timestamp), { addSuffix: true, locale: ptBR })}
          </div>
        )}
      </div>

      {/* Tags */}
      {card.tags && card.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {card.tags.slice(0, 3).map(tag => (
            <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
              <TagIcon className="w-3 h-3" />
              {tag}
            </span>
          ))}
          {card.tags.length > 3 && (
            <span className="text-xs text-gray-500">+{card.tags.length - 3}</span>
          )}
        </div>
      )}
    </motion.div>
  );
};

// Sortable Card Component
const SortableCard = ({ card, communications, onEdit, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card card={card} communications={communications} onEdit={onEdit} onDelete={onDelete} />
    </div>
  );
};

// Column Component with Communication Stats
const Column = ({ column, cards, communications, onAddCard, onEditCard, onDeleteCard }) => {
  const columnCommunications = communications.filter(comm => 
    cards.find(card => card.id === comm.card_id)
  );

  const recentActivity = columnCommunications.filter(comm => 
    new Date() - new Date(comm.timestamp) < 24 * 60 * 60 * 1000 // Last 24h
  ).length;

  return (
    <div className="flex-shrink-0 w-80 bg-gray-50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: column.color }}
          ></div>
          <h2 className="text-sm font-semibold text-gray-800">
            {column.title}
          </h2>
          <span className="bg-gray-200 text-gray-600 px-2 py-1 rounded-full text-xs font-medium">
            {cards.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {recentActivity > 0 && (
            <span className="flex items-center gap-1 text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
              <ChatBubbleLeftIcon className="w-3 h-3" />
              {recentActivity}
            </span>
          )}
          <button
            onClick={() => onAddCard(column.id)}
            className="p-1 hover:bg-white hover:shadow-sm rounded-md transition-all"
          >
            <PlusIcon className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      <SortableContext items={cards.map(card => card.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3 min-h-[200px]">
          {cards.map(card => (
            <SortableCard
              key={card.id}
              card={card}
              communications={communications}
              onEdit={onEditCard}
              onDelete={onDeleteCard}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
};

// Communications Tab Component
const CommunicationsTab = () => {
  const [communications, setCommunications] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [platformsStatus, setPlatformsStatus] = useState({});
  const [whatsappQR, setWhatsappQR] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadCommunicationsData();
    loadPlatformsStatus();
    
    // Poll for updates every 10 seconds
    const interval = setInterval(() => {
      loadCommunicationsData();
      loadPlatformsStatus();
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const loadCommunicationsData = async () => {
    try {
      const [communicationsRes, contactsRes] = await Promise.all([
        axios.get(`${API}/communications`),
        axios.get(`${API}/contacts`)
      ]);
      
      setCommunications(communicationsRes.data || []);
      setContacts(contactsRes.data || []);
    } catch (error) {
      console.error('Error loading communications data:', error);
    }
  };

  const loadPlatformsStatus = async () => {
    try {
      const response = await axios.get(`${API}/platforms/status`);
      setPlatformsStatus(response.data || {});
    } catch (error) {
      console.error('Error loading platforms status:', error);
    }
  };

  const connectWhatsApp = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/whatsapp/qr`);
      setWhatsappQR(response.data.qr);
      
      if (!response.data.qr && response.data.connected) {
        toast.success('WhatsApp já está conectado!');
      }
    } catch (error) {
      toast.error('Erro ao conectar WhatsApp');
      console.error('Error connecting WhatsApp:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', name: 'Visão Geral', icon: ChartBarIcon },
    { id: 'messages', name: 'Mensagens', icon: ChatBubbleLeftRightIcon },
    { id: 'config', name: 'Configurações', icon: CogIcon },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Central de Comunicação</h1>
        <p className="text-gray-600">Gerencie todas as conversas com leads em um só lugar</p>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Platform Status Cards */}
          <div className="lg:col-span-2">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Status das Plataformas</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {['whatsapp', 'messenger'].map(platform => (
                <div key={platform} className="bg-white rounded-lg border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <PlatformStatus 
                      platform={platform}
                      status={platformsStatus[platform]?.active ? 'connected' : 'disconnected'}
                      lastActivity={platformsStatus[platform]?.last_updated}
                    />
                  </div>
                  <div className="text-sm text-gray-600">
                    {platformsStatus[platform]?.configured 
                      ? 'Plataforma configurada' 
                      : 'Necessário configurar'
                    }
                  </div>
                </div>
              ))}
            </div>

            {/* Recent Communications */}
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Mensagens Recentes</h3>
            <div className="bg-white rounded-lg border p-4 max-h-96 overflow-y-auto">
              {communications.slice(0, 10).map((message, index) => (
                <MessageItem 
                  key={message.id} 
                  message={message} 
                  isLast={index === communications.length - 1} 
                />
              ))}
              {communications.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <ChatBubbleLeftRightIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Nenhuma conversa ainda</p>
                  <p className="text-sm">As mensagens aparecerão aqui quando chegarem</p>
                </div>
              )}
            </div>
          </div>

          {/* Statistics */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Estatísticas</h3>
            <div className="space-y-4">
              <div className="bg-white rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Mensagens Hoje</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {communications.filter(c => 
                      new Date(c.timestamp).toDateString() === new Date().toDateString()
                    ).length}
                  </span>
                </div>
              </div>
              
              <div className="bg-white rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Contatos Ativos</span>
                  <span className="text-2xl font-bold text-green-600">
                    {contacts.filter(c => 
                      new Date() - new Date(c.last_seen) < 24 * 60 * 60 * 1000
                    ).length}
                  </span>
                </div>
              </div>
              
              <div className="bg-white rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Respostas Automáticas</span>
                  <span className="text-2xl font-bold text-purple-600">
                    {communications.filter(c => c.automated_response).length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'messages' && (
        <div className="bg-white rounded-lg border">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Todas as Mensagens</h2>
          </div>
          <div className="p-4 max-h-96 overflow-y-auto">
            {communications.map((message, index) => (
              <MessageItem 
                key={message.id} 
                message={message} 
                isLast={index === communications.length - 1} 
              />
            ))}
          </div>
        </div>
      )}

      {activeTab === 'config' && (
        <div className="max-w-2xl">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Configurações das Plataformas</h2>
          
          {/* WhatsApp Configuration */}
          <div className="bg-white rounded-lg border p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">WhatsApp</h3>
                <p className="text-sm text-gray-600">Conecte sua conta do WhatsApp para receber mensagens</p>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm ${
                platformsStatus.whatsapp?.active
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {platformsStatus.whatsapp?.active ? 'Conectado' : 'Desconectado'}
              </div>
            </div>
            
            {!platformsStatus.whatsapp?.active && (
              <div className="text-center">
                <button
                  onClick={connectWhatsApp}
                  disabled={loading}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Conectando...' : 'Conectar WhatsApp'}
                </button>
                
                {whatsappQR && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-600 mb-3">
                      Escaneie o QR Code com seu WhatsApp:
                    </p>
                    <div className="flex justify-center">
                      <QRCode value={whatsappQR} size={200} />
                    </div>
                    <p className="text-xs text-gray-500 mt-3">
                      WhatsApp → Configurações → Aparelhos Conectados → Conectar Aparelho
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Messenger Configuration */}
          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Facebook Messenger</h3>
                <p className="text-sm text-gray-600">Configure sua página do Facebook para receber mensagens</p>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm ${
                platformsStatus.messenger?.active
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {platformsStatus.messenger?.active ? 'Conectado' : 'Desconectado'}
              </div>
            </div>
            
            {!platformsStatus.messenger?.active && (
              <div className="text-center py-4">
                <div className="text-sm text-gray-600 mb-4">
                  <p>Para configurar o Messenger:</p>
                  <ol className="list-decimal list-inside text-left max-w-md mx-auto space-y-1">
                    <li>Crie uma página no Facebook</li>
                    <li>Configure um App no Facebook Developers</li>
                    <li>Adicione as credenciais nas variáveis de ambiente</li>
                  </ol>
                </div>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                  Ver Documentação
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Main App Component
const App = () => {
  const [cards, setCards] = useState([]);
  const [columns, setColumns] = useState([]);
  const [activeCard, setActiveCard] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [analytics, setAnalytics] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [communications, setCommunications] = useState([]);
  const [activeTab, setActiveTab] = useState('kanban'); // 'kanban' or 'communications'

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadData();
    loadCommunications();
    
    // Poll for communications updates
    const interval = setInterval(loadCommunications, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [boardsResponse, analyticsResponse] = await Promise.all([
        axios.get(`${API}/boards`),
        axios.get(`${API}/analytics/pipeline`)
      ]);

      if (boardsResponse.data.length === 0) {
        await axios.post(`${API}/initialize`);
        loadData();
        return;
      }

      const board = boardsResponse.data[0];
      const [columnsResponse, cardsResponse] = await Promise.all([
        axios.get(`${API}/boards/${board.id}/columns`),
        axios.get(`${API}/cards`)
      ]);

      setColumns(columnsResponse.data);
      setCards(cardsResponse.data);
      setAnalytics(analyticsResponse.data);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const loadCommunications = async () => {
    try {
      const response = await axios.get(`${API}/communications`);
      setCommunications(response.data || []);
    } catch (error) {
      console.error('Error loading communications:', error);
    }
  };

  // Filter cards based on search and priority
  const filteredCards = cards.filter(card => {
    const matchesSearch = !searchTerm || 
      card.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPriority = !filterPriority || card.priority === filterPriority;
    
    return matchesSearch && matchesPriority;
  });

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeCard = cards.find(card => card.id === active.id);
    const overColumn = columns.find(col => 
      col.id === over.id || 
      cards.find(card => card.id === over.id)?.column_id === col.id
    );

    if (!activeCard || !overColumn) return;

    if (activeCard.column_id !== overColumn.id) {
      try {
        await axios.post(`${API}/cards/move`, {
          card_id: activeCard.id,
          destination_column_id: overColumn.id,
          position: 0
        });
        
        toast.success('Card movido com sucesso!');
        loadData();
      } catch (error) {
        console.error('Error moving card:', error);
        toast.error('Erro ao mover card');
      }
    }
  };

  const handleAddCard = (columnId) => {
    setActiveCard({
      title: "",
      description: "",
      contact_name: "",
      contact_email: "",
      contact_phone: "",
      estimated_value: 0,
      priority: "medium",
      assigned_to: "",
      tags: [],
      due_date: null,
      column_id: columnId
    });
    setShowModal(true);
  };

  const handleEditCard = (card) => {
    setActiveCard(card);
    setShowModal(true);
  };

  const handleDeleteCard = async (card) => {
    if (!window.confirm('Tem certeza que deseja excluir este card?')) return;
    
    try {
      await axios.delete(`${API}/cards/${card.id}`);
      toast.success('Card excluído com sucesso!');
      loadData();
    } catch (error) {
      console.error('Error deleting card:', error);
      toast.error('Erro ao excluir card');
    }
  };

  const handleSaveCard = async (cardData) => {
    try {
      if (cardData.id) {
        await axios.put(`${API}/cards/${cardData.id}`, cardData);
        toast.success('Card atualizado com sucesso!');
      } else {
        await axios.post(`${API}/cards`, cardData);
        toast.success('Card criado com sucesso!');
      }
      
      setShowModal(false);
      setActiveCard(null);
      loadData();
    } catch (error) {
      console.error('Error saving card:', error);
      toast.error('Erro ao salvar card');
    }
  };

  const tabs = [
    { id: 'kanban', name: 'Kanban', icon: Bars3Icon },
    { id: 'communications', name: 'Comunicação', icon: ChatBubbleLeftRightIcon },
    { id: 'analytics', name: 'Analytics', icon: ChartBarIcon },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando CRM...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-indigo-50 via-white to-cyan-50'
    }`}>
      {/* Header */}
      <header className={`sticky top-0 z-50 ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white/80 border-gray-200'
      } backdrop-blur-sm border-b`}>
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                CRM Omnichannel
              </h1>
              
              {/* Tab Navigation */}
              <nav className="flex space-x-4">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-100 text-blue-700'
                        : darkMode 
                          ? 'text-gray-300 hover:text-white hover:bg-gray-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <tab.icon className="w-5 h-5" />
                    {tab.name}
                  </button>
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-4">
              {activeTab === 'kanban' && (
                <>
                  {/* Search */}
                  <div className="relative">
                    <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar cards..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Priority Filter */}
                  <select
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Todas Prioridades</option>
                    <option value="high">Alta</option>
                    <option value="medium">Média</option>
                    <option value="low">Baixa</option>
                  </select>
                </>
              )}

              {/* Dark Mode Toggle */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-lg transition-colors ${
                  darkMode 
                    ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {darkMode ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {activeTab === 'kanban' && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-6 overflow-x-auto pb-6">
              {columns.map(column => {
                const columnCards = filteredCards.filter(card => card.column_id === column.id);
                return (
                  <Column
                    key={column.id}
                    column={column}
                    cards={columnCards}
                    communications={communications}
                    onAddCard={handleAddCard}
                    onEditCard={handleEditCard}
                    onDeleteCard={handleDeleteCard}
                  />
                );
              })}
            </div>

            <DragOverlay>
              {activeId ? (
                <Card
                  card={cards.find(card => card.id === activeId)}
                  communications={communications}
                  onEdit={() => {}}
                  onDelete={() => {}}
                />
              ) : null}
            </DragOverlay>
          </DndContext>
        )}

        {activeTab === 'communications' && <CommunicationsTab />}

        {activeTab === 'analytics' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Analytics content - keeping existing analytics */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Total de Cards</h3>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Bars3Icon className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {analytics.total_cards || 0}
              </div>
              <div className="text-sm text-gray-600">
                Leads no pipeline
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Valor do Pipeline</h3>
                <div className="p-2 bg-green-100 rounded-lg">
                  <CurrencyDollarIcon className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">
                R$ {(analytics.total_pipeline_value || 0).toLocaleString('pt-BR')}
              </div>
              <div className="text-sm text-gray-600">
                Valor total estimado
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Mensagens</h3>
                <div className="p-2 bg-purple-100 rounded-lg">
                  <ChatBubbleLeftRightIcon className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {analytics.communication_stats?.total_messages || 0}
              </div>
              <div className="text-sm text-gray-600">
                Total de conversas
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Conversas Ativas</h3>
                <div className="p-2 bg-orange-100 rounded-lg">
                  <SignalIcon className="w-6 h-6 text-orange-600" />
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {analytics.communication_stats?.active_conversations || 0}
              </div>
              <div className="text-sm text-gray-600">
                Últimos 7 dias
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Card Modal */}
      {showModal && activeCard && (
        <CardModal
          card={activeCard}
          onSave={handleSaveCard}
          onClose={() => {
            setShowModal(false);
            setActiveCard(null);
          }}
        />
      )}

      {/* Toast Container */}
      <Toaster position="top-right" />
    </div>
  );
};

// Card Modal Component (Enhanced)
const CardModal = ({ card, onSave, onClose }) => {
  const [formData, setFormData] = useState(card);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error('Error saving card:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                {card.id ? 'Editar Card' : 'Novo Card'}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Título *
              </label>
              <input
                type="text"
                required
                value={formData.title || ''}
                onChange={(e) => handleChange('title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Nome do lead ou empresa"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descrição
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Detalhes sobre o lead ou oportunidade"
              />
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome do Contato
                </label>
                <input
                  type="text"
                  value={formData.contact_name || ''}
                  onChange={(e) => handleChange('contact_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nome da pessoa de contato"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefone
                </label>
                <input
                  type="tel"
                  value={formData.contact_phone || ''}
                  onChange={(e) => handleChange('contact_phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="(11) 99999-9999"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.contact_email || ''}
                  onChange={(e) => handleChange('contact_email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="contato@empresa.com"
                />
              </div>
            </div>

            {/* Value and Priority */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valor Estimado (R$)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.estimated_value || ''}
                  onChange={(e) => handleChange('estimated_value', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0,00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prioridade
                </label>
                <select
                  value={formData.priority || 'medium'}
                  onChange={(e) => handleChange('priority', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="low">Baixa</option>
                  <option value="medium">Média</option>
                  <option value="high">Alta</option>
                </select>
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags (separadas por vírgula)
              </label>
              <input
                type="text"
                value={formData.tags?.join(', ') || ''}
                onChange={(e) => handleChange('tags', e.target.value.split(',').map(tag => tag.trim()).filter(Boolean))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="cliente vip, urgente, follow-up"
              />
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data de Vencimento
              </label>
              <input
                type="datetime-local"
                value={formData.due_date ? new Date(formData.due_date).toISOString().slice(0, 16) : ''}
                onChange={(e) => handleChange('due_date', e.target.value ? new Date(e.target.value).toISOString() : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default App;