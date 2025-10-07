import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function BasicTest() {
  const handleClick = () => {
    console.log('🧪 Basic test button clicked!');
    alert('Basic test working!');
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Basic Test</h1>
      <p>This is a basic test to see if the component renders.</p>
      
      <Button onClick={handleClick}>
        Test Button
      </Button>
      
      <Card>
        <CardHeader>
          <CardTitle>Test Card</CardTitle>
        </CardHeader>
        <CardContent>
          <p>If you can see this, the component is rendering correctly.</p>
        </CardContent>
      </Card>
    </div>
  );
}
