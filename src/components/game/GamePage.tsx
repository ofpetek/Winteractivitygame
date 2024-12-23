import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { gameService } from '../../lib/firebase/game-service';
import { Button } from '../ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Badge } from '../ui/badge';
import type { Week, Practice } from '../../lib/schemas';

export function GamePage() {
  const navigate = useNavigate();
  const [activeWeek, setActiveWeek] = useState<Week | null>(null);
  const [practices, setPractices] = useState<Practice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadActiveWeek();
  }, []);

  const loadActiveWeek = async () => {
    try {
      setIsLoading(true);
      const week = await gameService.getActiveWeek();
      
      if (week) {
        setActiveWeek(week);
        const weekPractices = await gameService.getPracticesByWeekId(week.id);
        setPractices(weekPractices);
      }
    } catch (error) {
      console.error('Error loading active week:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'hard':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Loading...</h2>
          <p className="text-gray-500">Getting your activities ready!</p>
        </div>
      </div>
    );
  }

  if (!activeWeek) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">No Active Week</h2>
          <p className="text-gray-500">Please check back later!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">{activeWeek.title}</h1>
        <p className="text-xl text-gray-600">{activeWeek.description}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {practices.map((practice) => (
          <Card key={practice.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            {practice.images.length > 0 && (
              <div className="aspect-video overflow-hidden">
                <img
                  src={practice.images[0].url}
                  alt={practice.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <CardHeader>
              <CardTitle>{practice.title}</CardTitle>
              <CardDescription>{practice.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Badge className={getDifficultyColor(practice.difficulty)}>
                {practice.difficulty}
              </Badge>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                onClick={() => navigate(`/practice/${practice.id}`)}
              >
                Start Practice
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {practices.length === 0 && (
        <div className="text-center py-12">
          <h3 className="text-xl font-semibold mb-2">No Practices Available</h3>
          <p className="text-gray-500">Check back soon for new activities!</p>
        </div>
      )}
    </div>
  );
}
