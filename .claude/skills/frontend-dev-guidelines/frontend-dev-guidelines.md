# Frontend Dev Guidelines

**Tech Stack:** React + Vite + TypeScript + shadcn/ui + TanStack Query

**Purpose:** Best practices for building accessible, type-safe UI components with modern data fetching patterns.

---

## Core Principles

1. **Component Composition** - Build with shadcn/ui primitives
2. **Type Safety** - TypeScript interfaces for all props and state
3. **Data Fetching** - TanStack Query for server state management
4. **Accessibility** - WCAG 2.1 AA compliance with shadcn/ui
5. **Responsive Design** - Mobile-first with Tailwind breakpoints
6. **Performance** - Memoization, lazy loading, code splitting

---

## Quick Reference

### Standard Component Structure
```tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface PlayerCardProps {
  playerId: string;
  playerName: string;
  team?: string;
  onSelect?: (id: string) => void;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  playerId,
  playerName,
  team,
  onSelect
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{playerName}</span>
          {team && <Badge variant="secondary">{team}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={() => onSelect?.(playerId)}
          variant="default"
        >
          View Details
        </Button>
      </CardContent>
    </Card>
  );
};
```

### Data Fetching with TanStack Query
```tsx
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

interface Player {
  id: string;
  name: string;
  team: string;
}

export function usePlayers(sport: string) {
  return useQuery({
    queryKey: ['players', sport],
    queryFn: async () => {
      const res = await apiFetch(`/api/players?sport=${sport}`);
      if (!res.ok) throw new Error('Failed to fetch players');
      const data = await res.json();
      return data.data as Player[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1
  });
}

// Usage in component
export const PlayerList: React.FC = () => {
  const { data: players, isLoading, error } = usePlayers('NFL');
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {players?.map(player => (
        <PlayerCard key={player.id} {...player} />
      ))}
    </div>
  );
};
```

### shadcn/ui Component Usage
```tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const FilterDialog: React.FC = () => {
  const [sport, setSport] = useState('NFL');
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Filters</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Filter Options</DialogTitle>
        </DialogHeader>
        <Select value={sport} onValueChange={setSport}>
          <SelectTrigger>
            <SelectValue placeholder="Select sport" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NFL">NFL</SelectItem>
            <SelectItem value="NBA">NBA</SelectItem>
            <SelectItem value="MLB">MLB</SelectItem>
          </SelectContent>
        </Select>
      </DialogContent>
    </Dialog>
  );
};
```

---

## Resources

- [Component Patterns](./resources/component-patterns.md) - Composition, props, hooks
- [Data Fetching](./resources/data-fetching.md) - TanStack Query patterns, mutations
- [Styling Guide](./resources/styling-guide.md) - Tailwind classes, responsive design
- [Accessibility](./resources/accessibility.md) - ARIA attributes, keyboard navigation

---

## Common Mistakes

### ❌ Mistake 1: Missing TypeScript Interfaces
```tsx
// BAD: No type definition
export const PlayerCard = ({ player, onSelect }) => {
  return <div onClick={() => onSelect(player.id)}>{player.name}</div>;
};

// GOOD: Typed props
interface PlayerCardProps {
  player: {
    id: string;
    name: string;
  };
  onSelect: (id: string) => void;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({ player, onSelect }) => {
  return <div onClick={() => onSelect(player.id)}>{player.name}</div>;
};
```

### ❌ Mistake 2: Not Using shadcn/ui Components
```tsx
// BAD: Custom button from scratch
export const CustomButton = ({ onClick, children }) => {
  return (
    <button 
      onClick={onClick}
      className="px-4 py-2 bg-blue-500 text-white rounded"
    >
      {children}
    </button>
  );
};

// GOOD: Use shadcn/ui Button
import { Button } from '@/components/ui/button';

export const MyComponent = () => {
  return <Button variant="default">Click Me</Button>;
};
```

### ❌ Mistake 3: Fetching in useEffect Instead of TanStack Query
```tsx
// BAD: Manual fetching with useEffect
export const PlayerList = () => {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetch('/api/players')
      .then(res => res.json())
      .then(data => {
        setPlayers(data);
        setLoading(false);
      });
  }, []);
  
  if (loading) return <div>Loading...</div>;
  return <div>{/* render players */}</div>;
};

// GOOD: TanStack Query
export const PlayerList = () => {
  const { data: players, isLoading } = useQuery({
    queryKey: ['players'],
    queryFn: async () => {
      const res = await apiFetch('/api/players');
      return res.json();
    }
  });
  
  if (isLoading) return <div>Loading...</div>;
  return <div>{/* render players */}</div>;
};
```

### ❌ Mistake 4: Not Handling Loading/Error States
```tsx
// BAD: No loading or error handling
export const PlayerList = () => {
  const { data: players } = usePlayers();
  
  return (
    <div>
      {players.map(p => <PlayerCard key={p.id} player={p} />)}
    </div>
  );
};

// GOOD: Proper state handling
export const PlayerList = () => {
  const { data: players, isLoading, error } = usePlayers();
  
  if (isLoading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }
  
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load players: {error.message}
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <div className="grid gap-4">
      {players?.map(p => <PlayerCard key={p.id} player={p} />)}
    </div>
  );
};
```

### ❌ Mistake 5: Inline Styles Instead of Tailwind
```tsx
// BAD: Inline styles
export const PlayerCard = ({ player }) => {
  return (
    <div style={{ padding: '16px', backgroundColor: '#fff', borderRadius: '8px' }}>
      <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>{player.name}</h3>
    </div>
  );
};

// GOOD: Tailwind classes
export const PlayerCard = ({ player }) => {
  return (
    <div className="p-4 bg-white dark:bg-slate-800 rounded-lg">
      <h3 className="text-lg font-bold">{player.name}</h3>
    </div>
  );
};
```

### ❌ Mistake 6: Not Using React.memo for Expensive Components
```tsx
// BAD: Re-renders on every parent render
export const ExpensivePlayerCard = ({ player }) => {
  // Heavy computation or large list
  const stats = computeComplexStats(player);
  return <Card>{/* render stats */}</Card>;
};

// GOOD: Memoized to prevent unnecessary re-renders
export const ExpensivePlayerCard = React.memo(({ player }) => {
  const stats = useMemo(() => computeComplexStats(player), [player]);
  return <Card>{/* render stats */}</Card>;
});
```

---

## shadcn/ui Component Library

### Available Components
```tsx
// Layout
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

// Form Inputs
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';

// Feedback
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

// Icons (lucide-react)
import { TrendingUp, Target, BarChart3, Activity } from 'lucide-react';
```

### Button Variants
```tsx
<Button variant="default">Default</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Outline</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>

<Button size="default">Default Size</Button>
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
<Button size="icon"><Icon /></Button>
```

### Badge Variants
```tsx
<Badge variant="default">Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="destructive">Error</Badge>
<Badge variant="outline">Outline</Badge>
```

---

## Responsive Design

### Tailwind Breakpoints
```tsx
<div className="
  grid
  grid-cols-1       // Mobile: 1 column
  md:grid-cols-2    // Tablet: 2 columns
  lg:grid-cols-3    // Desktop: 3 columns
  xl:grid-cols-4    // Large: 4 columns
  gap-4
">
  {items.map(item => <Card key={item.id}>{/* content */}</Card>)}
</div>
```

### Mobile-First Patterns
```tsx
// Mobile-first: base styles apply to mobile, then override for larger screens
<div className="
  p-4             // Mobile: 16px padding
  md:p-6          // Tablet+: 24px padding
  lg:p-8          // Desktop+: 32px padding
">
  <h1 className="
    text-2xl      // Mobile: 24px
    md:text-3xl   // Tablet+: 30px
    lg:text-4xl   // Desktop+: 36px
    font-bold
  ">
    Responsive Title
  </h1>
</div>
```

---

## Performance Optimization

### Lazy Loading
```tsx
import { lazy, Suspense } from 'react';

const HeavyComponent = lazy(() => import('./HeavyComponent'));

export const ParentComponent = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HeavyComponent />
    </Suspense>
  );
};
```

### Query Prefetching
```tsx
import { useQueryClient } from '@tanstack/react-query';

export const PlayerListPage = () => {
  const queryClient = useQueryClient();
  
  // Prefetch on hover
  const handlePlayerHover = (playerId: string) => {
    queryClient.prefetchQuery({
      queryKey: ['player', playerId],
      queryFn: () => fetchPlayer(playerId)
    });
  };
  
  return (
    <div>
      {players.map(p => (
        <div 
          key={p.id} 
          onMouseEnter={() => handlePlayerHover(p.id)}
        >
          {p.name}
        </div>
      ))}
    </div>
  );
};
```

---

## Testing Patterns

### Component Testing (Vitest + Testing Library)
```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PlayerCard } from './PlayerCard';

describe('PlayerCard', () => {
  it('renders player name', () => {
    render(<PlayerCard playerId="1" playerName="Patrick Mahomes" />);
    expect(screen.getByText('Patrick Mahomes')).toBeInTheDocument();
  });
  
  it('calls onSelect when button clicked', () => {
    const onSelect = vi.fn();
    render(
      <PlayerCard 
        playerId="1" 
        playerName="Patrick Mahomes" 
        onSelect={onSelect} 
      />
    );
    
    fireEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith('1');
  });
});
```

---

## Next Steps

See resource files for detailed patterns:
1. **Component Patterns** - Advanced composition, custom hooks
2. **Data Fetching** - Mutations, optimistic updates, error boundaries
3. **Styling Guide** - Theme customization, dark mode, animations
4. **Accessibility** - Screen readers, keyboard nav, focus management

---

**Related:** [Backend Dev Guidelines](../backend-dev-guidelines/backend-dev-guidelines.md), [Sports Data Pipeline](../sports-data-pipeline/sports-data-pipeline.md)
