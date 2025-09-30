import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Star, 
  Minus, 
  TrendingUp, 
  Users, 
  Target,
  Info
} from 'lucide-react';

export const KarmaExplanation: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="w-5 h-5" />
          How Prediction Karma Works
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Earn or lose karma based on your prediction accuracy and engagement level.
        </div>

        {/* Base Karma */}
        <div className="space-y-2">
          <h4 className="font-medium">Base Karma</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
              <Star className="w-4 h-4 text-green-600" />
              <span className="text-sm">Correct Prediction</span>
              <Badge variant="secondary" className="bg-green-100 text-green-700">+2</Badge>
            </div>
            <div className="flex items-center gap-2 p-2 bg-red-50 rounded">
              <Minus className="w-4 h-4 text-red-600" />
              <span className="text-sm">Incorrect Prediction</span>
              <Badge variant="secondary" className="bg-red-100 text-red-700">-1</Badge>
            </div>
          </div>
        </div>

        {/* Confidence Multiplier */}
        <div className="space-y-2">
          <h4 className="font-medium">Confidence Multiplier</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Confidence Level 1 (Low)</span>
              <span className="text-muted-foreground">0.6x multiplier</span>
            </div>
            <div className="flex justify-between">
              <span>Confidence Level 2-3 (Medium)</span>
              <span className="text-muted-foreground">0.7-0.8x multiplier</span>
            </div>
            <div className="flex justify-between">
              <span>Confidence Level 4-5 (High)</span>
              <span className="text-muted-foreground">0.9-1.0x multiplier</span>
            </div>
          </div>
        </div>

        {/* Participation Bonus */}
        <div className="space-y-2">
          <h4 className="font-medium">Participation Bonus</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                100+ votes
              </span>
              <Badge variant="secondary" className="bg-green-100 text-green-700">+1 bonus</Badge>
            </div>
            <div className="flex justify-between">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                50-99 votes
              </span>
              <span className="text-muted-foreground">No bonus</span>
            </div>
            <div className="flex justify-between">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                Under 50 votes
              </span>
              <Badge variant="secondary" className="bg-red-100 text-red-700">-1 penalty</Badge>
            </div>
          </div>
        </div>

        {/* Examples */}
        <div className="space-y-2">
          <h4 className="font-medium">Examples</h4>
          <div className="space-y-2 text-sm">
            <div className="p-2 bg-muted/50 rounded">
              <div className="font-medium">High Confidence + Popular Prediction</div>
              <div className="text-muted-foreground">
                Correct prediction with confidence 5 on a prop with 150 votes
              </div>
              <div className="text-green-600 font-medium">
                +2 × 1.0 + 1 = +3 karma
              </div>
            </div>
            <div className="p-2 bg-muted/50 rounded">
              <div className="font-medium">Low Confidence + Unpopular Prediction</div>
              <div className="text-muted-foreground">
                Incorrect prediction with confidence 1 on a prop with 20 votes
              </div>
              <div className="text-red-600 font-medium">
                -1 × 0.6 - 1 = -1.6 → -2 karma
              </div>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="p-3 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">💡 Tips for Maximizing Karma</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Make confident predictions on popular props</li>
            <li>• Focus on props with high engagement (100+ votes)</li>
            <li>• Be accurate rather than just confident</li>
            <li>• Participate in trending predictions</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
