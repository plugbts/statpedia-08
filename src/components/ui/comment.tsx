import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { VerifiedCheckmark } from '@/components/ui/verified-checkmark';
import { cn } from '@/lib/utils';

interface CommentProps {
  id: string;
  author: string;
  authorEmail: string;
  authorRole: string;
  content: string;
  timestamp: string;
  likes?: number;
  replies?: number;
  className?: string;
}

export const Comment: React.FC<CommentProps> = ({
  id,
  author,
  authorEmail,
  authorRole,
  content,
  timestamp,
  likes = 0,
  replies = 0,
  className
}) => {
  return (
    <div className={cn('flex gap-3 p-4 bg-card/50 rounded-lg border border-border/30', className)}>
      <Avatar className="h-8 w-8 border-2 border-primary/20">
        <AvatarFallback className="bg-gradient-primary text-white text-sm">
          {author[0]?.toUpperCase() || authorEmail[0]?.toUpperCase() || 'U'}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center">
            <span className="font-medium text-foreground text-sm">{author}</span>
            <VerifiedCheckmark role={authorRole} size="sm" />
          </div>
          <span className="text-xs text-muted-foreground">•</span>
          <span className="text-xs text-muted-foreground">{timestamp}</span>
        </div>
        
        <p className="text-sm text-foreground leading-relaxed">{content}</p>
        
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <button className="hover:text-foreground transition-colors">
            Like {likes > 0 && `(${likes})`}
          </button>
          <button className="hover:text-foreground transition-colors">
            Reply {replies > 0 && `(${replies})`}
          </button>
        </div>
      </div>
    </div>
  );
};
