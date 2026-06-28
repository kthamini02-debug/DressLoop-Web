import React, { useEffect, useState, useRef } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useNotifications } from '../context/NotificationContext';
import { MessageSquare, Send, Loader2, User, Building, Heart, Circle, ArrowLeft } from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  email: string;
  organization_name?: string;
  request_status: string;
  donation_title: string;
  donation_id: string;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  timestamp: string;
}

export const Chat: React.FC = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { triggerToast } = useNotifications();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');

  // Loading states
  const [contactsLoading, setContactsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);

  // Real-time online users & typing states
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const typingTimeoutRef = useRef<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch active contacts
  const fetchContacts = async () => {
    try {
      const res = await api.get('/messages/contacts');
      setContacts(res.data);
      if (res.data.length > 0 && !selectedContact) {
        // Optionally auto-select first contact
        setSelectedContact(res.data[0]);
      }
    } catch (err) {
      console.error(err);
      triggerToast('Error', 'Failed to load chat contact list.', 'warning');
    } finally {
      setContactsLoading(false);
    }
  };

  // Fetch message history for selected contact
  const fetchMessages = async (contactId: string) => {
    setMessagesLoading(true);
    try {
      const res = await api.get(`/messages/history/${contactId}`);
      setMessages(res.data);
    } catch (err) {
      console.error(err);
      triggerToast('Error', 'Failed to fetch conversation history.', 'warning');
    } finally {
      setMessagesLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  // Join the chat room on select contact and handle reconnects
  useEffect(() => {
    if (selectedContact) {
      fetchMessages(selectedContact.id);
      setIsPartnerTyping(false);
    }

    if (!socket || !selectedContact || !user) return;

    const joinRoom = () => {
      const roomId = [user.id, selectedContact.id].sort().join('_');
      socket.emit('join_room', roomId);
      console.log('Joined room:', roomId);
    };

    if (socket.connected) {
      joinRoom();
    }

    socket.on('connect', joinRoom);

    return () => {
      socket.off('connect', joinRoom);
    };
  }, [selectedContact, socket, user]);

  // Handle incoming real-time messages & status events
  useEffect(() => {
    if (!socket) return;

    // Listen for incoming messages
    const handleReceiveMessage = (message: Message) => {
      console.log('💬 Socket Message Received:', message);
      // Validate that this message belongs to the current conversation
      if (selectedContact && (message.sender_id === selectedContact.id || message.receiver_id === selectedContact.id)) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
      }
      setIsPartnerTyping(false);
    };

    const handlePartnerTyping = ({
      userId,
      isTyping,
    }: {
      userId: string;
      isTyping: boolean;
    }) => {
      if (selectedContact && userId === selectedContact.id) {
        setIsPartnerTyping(isTyping);
      }
    };
      
    // Listen for online status updates
    const handleUserStatus = ({ userId, status }: { userId: string; status: 'online' | 'offline' }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        if (status === 'online') {
          next.add(userId);
        } else {
          next.delete(userId);
        }
        return next;
      });
    };

    const handleOnlineUsersList = (userIds: string[]) => {
      console.log('🟢 Online users list received:', userIds);
      setOnlineUsers(new Set(userIds));
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('user_typing', handlePartnerTyping);
    socket.on('user_status', handleUserStatus);
    socket.on('online_users_list', handleOnlineUsersList);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('user_typing', handlePartnerTyping);
      socket.off('user_status', handleUserStatus);
      socket.off('online_users_list', handleOnlineUsersList);
    };
  }, [socket, selectedContact, user]);

  // Auto Scroll to Bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isPartnerTyping]);

  // Send Message handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContact || !inputText.trim()) return;

    const messageText = inputText.trim();
    setInputText('');

    // Stop typing emitter
    if (socket && user) {
      const roomId = [user.id, selectedContact.id].sort().join('_');
      socket.emit('typing', { roomId, isTyping: false });
    }

    try {
      await api.post('/messages', {
        receiver_id: selectedContact.id,
        message: messageText,
      });
      // Message is appended in handleReceiveMessage 
      // via Socket broadcast callback,
      // but in case socket is delayed we fetch or wait. The socket broadcast is instant.
    } catch (err: any) {
      triggerToast('Error', err.response?.data?.error || 'Message sending failed.', 'warning');
    }
  };

  // Typing indicator trigger
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);

    if (!socket || !user || !selectedContact) return;

    const roomId = [user.id, selectedContact.id].sort().join('_');
    socket.emit('typing', { roomId, isTyping: true });

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to emit stop typing after 1.5 seconds of silence
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing', { roomId, isTyping: false });
    }, 1500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-[calc(100vh-8rem)]">
      <div className="glass-panel rounded-2xl h-full flex overflow-hidden border border-slate-100 dark:border-slate-800">
        
        {/* ========================================================= */}
        {/* LEFT PANEL: CONTACTS LIST */}
        {/* ========================================================= */}
        <div className={`w-full md:w-80 border-r border-slate-150 dark:border-slate-700/60 flex flex-col ${
          selectedContact ? 'hidden md:flex' : 'flex'
        }`}>
          <div className="p-4 border-b border-slate-100 dark:border-slate-700">
            <h2 className="font-bold text-slate-850 dark:text-white text-base">Active Chats</h2>
            <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-0.5">Matched NGO-Donor conversations</p>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-700/30">
            {contactsLoading ? (
              <div className="flex flex-col items-center justify-center h-full">
                <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                <span className="text-[10px] text-slate-500 mt-2">Loading contacts...</span>
              </div>
            ) : contacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-4 text-center text-slate-400">
                <MessageSquare className="w-10 h-10 mb-2 text-slate-300" />
                <span className="text-xs">No active chats matches yet.</span>
                <p className="text-[10px] text-slate-500 mt-1 max-w-[200px]">
                  Chats open automatically once a donation request has been accepted.
                </p>
              </div>
            ) : (
              contacts.map((contact) => {
                const displayName = contact.organization_name || contact.name;
                const isOnline = onlineUsers.has(contact.id);

                return (
                  <button
                    key={`${contact.id}_${contact.donation_id}`}
                    onClick={() => setSelectedContact(contact)}
                    className={`w-full p-4 flex items-start text-left gap-3 transition-colors ${
                      selectedContact?.id === contact.id
                        ? 'bg-emerald-50/30 dark:bg-emerald-950/10'
                        : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/20'
                    }`}
                  >
                    {/* Icon container with online indicator */}
                    <div className="relative flex-shrink-0 mt-0.5">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center border border-slate-200/50 dark:border-slate-700">
                        {contact.organization_name ? (
                          <Building className="w-5 h-5" />
                        ) : (
                          <User className="w-5 h-5" />
                        )}
                      </div>
                      <Circle
                        className={`w-3 h-3 absolute -bottom-0.5 -right-0.5 rounded-full fill-current ${
                          isOnline ? 'text-emerald-500' : 'text-slate-350 dark:text-slate-650'
                        }`}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                          {displayName}
                        </span>
                        <span className="text-[9px] text-slate-400 capitalize">{contact.request_status}</span>
                      </div>
                      
                      <div className="flex items-center text-[10px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                        <Heart className="w-3 h-3 text-rose-500 mr-1 flex-shrink-0" />
                        <span className="truncate">Donation: {contact.donation_title}</span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT PANEL: CONVERSATION WINDOW */}
        {/* ========================================================= */}
        <div className={`flex-1 flex flex-col justify-between h-full bg-slate-50/20 dark:bg-slate-900/10 ${
          !selectedContact ? 'hidden md:flex' : 'flex'
        }`}>
          {selectedContact ? (
            <>
              {/* Active Contact Header */}
              <div className="p-4 border-b border-slate-150 dark:border-slate-700 bg-white dark:bg-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedContact(null)}
                    className="md:hidden p-1 text-slate-500 hover:bg-slate-100 rounded"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                      {selectedContact.organization_name || selectedContact.name}
                    </h3>
                    <span className="text-[10px] text-slate-400">
                      {onlineUsers.has(selectedContact.id) ? 'Online' : 'Offline'} | Donation: {selectedContact.donation_title}
                    </span>
                  </div>
                </div>
              </div>

              {/* Chat Bubble List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messagesLoading ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                    <span className="text-xs text-slate-500 mt-2">Retrieving conversation...</span>
                  </div>
                ) : (
                  <>
                    {messages.map((msg) => {
                      const isMe = msg.sender_id === user?.id;

                      return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] rounded-2xl px-4 py-2 text-xs shadow-sm border ${
                            isMe
                              ? 'bg-emerald-600 border-emerald-600 text-white rounded-br-none'
                              : 'bg-white border-slate-150 text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 rounded-bl-none'
                          }`}>
                            <p className="leading-relaxed break-words">{msg.message}</p>
                            <span className={`text-[9px] block text-right mt-1.5 ${
                              isMe ? 'text-emerald-100' : 'text-slate-400'
                            }`}>
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {/* Typing status bubble indicator */}
                    {isPartnerTyping && (
                      <div className="flex justify-start">
                        <div className="bg-slate-100 dark:bg-slate-800 border border-slate-150 dark:border-slate-700 text-slate-450 dark:text-slate-350 rounded-2xl rounded-bl-none px-4 py-2 text-xs flex items-center gap-1">
                          <span className="italic">
                            {user?.role === 'donor' ? 'NGO' : 'Donor'} is typing...
                          </span>
                          <span className="flex gap-0.5">
                            <span className="w-1 h-1 bg-slate-450 rounded-full animate-bounce delay-100" />
                            <span className="w-1 h-1 bg-slate-450 rounded-full animate-bounce delay-200" />
                            <span className="w-1 h-1 bg-slate-450 rounded-full animate-bounce delay-300" />
                          </span>
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Chat Input form */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-150 dark:border-slate-700/60 bg-white dark:bg-slate-800 flex gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={handleInputChange}
                  placeholder="Type your message here..."
                  className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-850 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
                  required
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <MessageSquare className="w-12 h-12 mb-3 text-slate-350 dark:text-slate-650" />
              <span className="text-sm">Select a contact to start messaging.</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
