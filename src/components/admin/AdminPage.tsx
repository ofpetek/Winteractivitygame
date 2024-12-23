import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { WeekForm } from './WeekForm';
import { adminService } from '../../lib/firebase/admin-service';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import type { Week } from '../../lib/schemas';

export function AdminPage() {
  const navigate = useNavigate();
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [isAddingWeek, setIsAddingWeek] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadWeeks();
  }, []);

  const loadWeeks = async () => {
    try {
      const fetchedWeeks = await adminService.getAllWeeks();
      setWeeks(fetchedWeeks);
    } catch (error) {
      console.error('Error loading weeks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWeekAdded = () => {
    setIsAddingWeek(false);
    loadWeeks();
  };

  const handleToggleActive = async (weekId: string, currentState: boolean) => {
    try {
      // If we're activating this week, deactivate all others
      if (!currentState) {
        const updatePromises = weeks
          .filter(w => w.id !== weekId && w.isActive)
          .map(w => adminService.updateWeek(w.id, { isActive: false }));
        
        await Promise.all(updatePromises);
      }
      
      // Toggle the selected week
      await adminService.updateWeek(weekId, { isActive: !currentState });
      
      // Reload weeks to get updated state
      loadWeeks();
    } catch (error) {
      console.error('Error toggling week active state:', error);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex flex-wrap justify-between items-center mb-6">
        <div className="w-full">
          <h1 className="text-left text-3xl font-bold">Admin Dashboard</h1>
        </div>
        <Button onClick={() => setIsAddingWeek(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Week
        </Button>
      </div>

      {isAddingWeek && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Add New Week</CardTitle>
          </CardHeader>
          <CardContent>
            <WeekForm onComplete={handleWeekAdded} onCancel={() => setIsAddingWeek(false)} />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {weeks.map((week) => (
          <Card key={week.id} className="relative">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle>Week {week.weekNumber}</CardTitle>
                <div className="flex items-center space-x-2">
                  <Switch
                    id={`active-${week.id}`}
                    checked={week.isActive}
                    onCheckedChange={() => handleToggleActive(week.id, week.isActive)}
                  />
                  <Label htmlFor={`active-${week.id}`}>
                    {week.isActive ? 'Active' : 'Inactive'}
                  </Label>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <h3 className="font-semibold mb-2">{week.title}</h3>
              <p className="text-sm text-gray-500 mb-4">{week.description}</p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate(`/admin/week/${week.id}`)}
              >
                Manage Practices
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {!isLoading && weeks.length === 0 && (
        <div className="text-center py-12">
          <h3 className="text-xl font-semibold mb-2">No Weeks Created</h3>
          <p className="text-gray-500">Click the "Add Week" button to create your first week!</p>
        </div>
      )}
    </div>
  );
}
