
import React, { useState, ChangeEvent, useRef } from 'react';
import { Smile, Paperclip, Send, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';

interface ChatInputProps {
  onSendMessage: (text: string, attachments?: Array<{ type: "image" | "video" | "file"; url: string; name?: string }>) => void;
}

const ChatInput = ({ onSendMessage }: ChatInputProps) => {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<Array<{ type: "image" | "video" | "file"; url: string; name?: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (message.trim() || attachments.length > 0) {
      onSendMessage(message, attachments);
      setMessage('');
      setAttachments([]);
      toast({
        title: "Message Sent",
        description: "Your message has been sent successfully.",
      });
    }
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length === 0) return;
    
    files.forEach(file => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const result = event.target?.result as string;
        const fileType = file.type.split('/')[0];
        
        setAttachments(prev => [
          ...prev, 
          { 
            type: fileType === 'image' ? 'image' : 
                 fileType === 'video' ? 'video' : 'file', 
            url: result,
            name: file.name
          }
        ]);
      };
      
      reader.readAsDataURL(file);
    });
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  return (
    <div className="border-t p-3">
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((attachment, index) => (
            <div key={index} className="relative h-20 w-20">
              {attachment.type === 'image' && (
                <img 
                  src={attachment.url} 
                  alt={attachment.name || 'Attachment'} 
                  className="h-full w-full rounded object-cover" 
                />
              )}
              {attachment.type === 'video' && (
                <video 
                  src={attachment.url} 
                  className="h-full w-full rounded object-cover" 
                />
              )}
              <button 
                className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground"
                onClick={() => removeAttachment(index)}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Textarea
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="min-h-[60px] resize-none"
          />
        </div>
        
        <div className="flex items-center gap-1">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="rounded-full p-2 text-muted-foreground hover:bg-muted"
            onClick={() => toast({
              title: "Emoji Picker",
              description: "Emoji picker is not implemented in this demo.",
            })}
          >
            <Smile className="h-5 w-5" />
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="rounded-full p-2 text-muted-foreground hover:bg-muted"
            onClick={handleFileClick}
          >
            <Paperclip className="h-5 w-5" />
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileChange}
              multiple
              accept="image/*,video/*"
            />
          </motion.button>
          
          <Button 
            onClick={handleSend}
            size="icon"
            className="rounded-full"
            disabled={!message.trim() && attachments.length === 0}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
