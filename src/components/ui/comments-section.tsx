import React from 'react';
import { Comment } from './comment';

interface CommentsSectionProps {
  className?: string;
}

export const CommentsSection: React.FC<CommentsSectionProps> = ({ className }) => {
  const sampleComments = [
    {
      id: '1',
      author: 'Plug',
      authorEmail: 'plug@plugbts.com',
      authorRole: 'owner',
      content: 'Great prediction! The analytics on this one look solid. Keep up the good work!',
      timestamp: '2h ago',
      likes: 12,
      replies: 3
    },
    {
      id: '2',
      author: 'AdminUser',
      authorEmail: 'admin@statpedia.com',
      authorRole: 'admin',
      content: 'I agree with this analysis. The historical data supports the over prediction.',
      timestamp: '1h ago',
      likes: 8,
      replies: 1
    },
    {
      id: '3',
      author: 'Moderator',
      authorEmail: 'mod@statpedia.com',
      authorRole: 'mod',
      content: 'Thanks for sharing this insight. The community appreciates quality predictions like this.',
      timestamp: '45m ago',
      likes: 5,
      replies: 0
    },
    {
      id: '4',
      author: 'RegularUser',
      authorEmail: 'user@example.com',
      authorRole: 'user',
      content: 'This is really helpful! I\'m learning so much from these predictions.',
      timestamp: '30m ago',
      likes: 3,
      replies: 0
    }
  ];

  return (
    <div className={className}>
      <h3 className="text-lg font-semibold text-foreground mb-4">Comments</h3>
      <div className="space-y-4">
        {sampleComments.map((comment) => (
          <Comment
            key={comment.id}
            {...comment}
          />
        ))}
      </div>
    </div>
  );
};
