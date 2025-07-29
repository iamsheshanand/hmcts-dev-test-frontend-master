import { Application, Request, Response } from 'express';
import axios from 'axios';
import methodOverride from 'method-override';

export default function (app: Application): void {
  console.log('Before calling tasks');

  app.use(methodOverride((req: Request, res: Response) => {
    const method = req.body._method || req.query._method;
    if (method) {
      console.log('Method override triggered with _method:', method); // Debug log
    }
    return method;
  }));

  app.get('/', async (req: Request, res: Response) => {
    try {
      const response = await axios.get('http://localhost:4000/tasks');
      // console.log('Tasks data received:', JSON.stringify(response.data, null, 2)); // Log the data
      if (!Array.isArray(response.data)) {
        console.warn('Warning: tasks data is not an array:', typeof response.data, response.data);
        res.render('home', { rows: [], error: 'Tasks data is invalid' });
        return 
      }
      // res.render('home', { tasks: response.data });
      // Transform tasks into rows
    const rows = response.data.length > 0
      ? response.data
          .sort((a: any, b: any) => a.id - b.id) // Sort by id
          .map((task: any) => {
            // Format status
            let displayStatus = task.status;
            if (task.status === 'IN_PROGRESS') {
              displayStatus = 'In Progress';
            } else if (task.status === 'TODO') {
              displayStatus = 'To Do';
            } else if (task.status === 'COMPLETED') {
              displayStatus = 'Completed';
            } else {
              displayStatus = task.status || 'N/A';
            }

            // Generate action links (rendered as HTML string)
            const actions = `
              <a href="/tasks/${task.id || '0'}" class="govuk-link">View</a> | 
              <a href="/tasks/${task.id || '0'}/edit" class="govuk-link">Edit</a> | 
              <a href="/tasks/${task.id || '0'}?_method=DELETE" class="govuk-link">Delete</a>
            `;

            return [
              { text: task.id || 'N/A' },
              { text: task.title || '' },
              { text: task.description || '' },
              { text: task.dueDate || '' },
              { text: displayStatus },
              { html: actions }
            ];
          })
      : [[
          { text: 'N/A' },
          { text: 'No tasks available' },
          { text: '' },
          { text: '' },
          { text: '' },
          { text: '' }
        ]];

    res.render('home', { rows });
    } catch (error) {
      console.error('Error fetching tasks:', error);
      res.render('home', { tasks: [], error: 'Failed to load tasks' });
    }
  });

  app.get('/tasks/new', (req: Request, res: Response ) => {
    res.render('task-form', { task: null });
  });

  // Edit task
  app.get('/tasks/:id/edit', async (req: Request, res: Response) => {
    try {
      const response = await axios.get(`http://localhost:4000/tasks/${req.params.id}`);
      // console.log('Task data for edit:', JSON.stringify(response.data, null, 2)); // Debug log
      if (!response.data) {
        throw new Error('Task not found');
      }
      res.render('task-form', { task: response.data });
    } catch (error) {
      console.error('Error fetching task for edit:', error.message, error.stack);
      res.status(404).render('not-found', { message: 'Task not found' });
    }
  });


  app.post('/tasks', async (req: Request, res: Response) => {
    try {
      const taskData = {
        title: req.body.title,
        description: req.body.description,
        status: req.body.status || 'TODO',
        dueDate: req.body['dueDate-day']
          ? `${req.body['dueDate-year']}-${req.body['dueDate-month']}-${req.body['dueDate-day']}`
          : null,
      };
      await axios.post('http://localhost:4000/tasks', taskData);
      res.redirect('/');
    } catch (error) {
      console.error('Error creating task:', error.message, error.stack);
      res.render('task-form', { task: req.body, error: 'Failed to create task' });
    }
  });

  // Find task by ID
  app.get('/tasks/:id', async (req: Request, res: Response) => {
    try {
      const response = await axios.get(`http://localhost:4000/tasks/${req.params.id}`);
      res.render('task-details', { task: response.data });
    } catch (error) {
      console.error('Error fetching task by ID:', error.message, error.stack);
      res.render('not-found', { message: 'Task not found' });
    }
  });

  // Delete task by ID
  app.delete('/tasks/:id', async (req: Request, res: Response) => {
    try {
      await axios.delete(`http://localhost:4000/tasks/${req.params.id}`);
      res.redirect('/');
    } catch (error) {
      console.error('Error deleting task:', error.message, error.stack);
      res.render('home', { tasks: [], error: 'Failed to delete task' });
    }
  });

  // Partial update task by ID
  app.patch('/tasks/:id', async (req: Request, res: Response) => {
    try {
      const taskData = {
        status: req.body.status, // Only updating status as per TasksController
      };
      await axios.patch(`http://localhost:4000/tasks/${req.params.id}`, taskData);
      res.redirect('/');
    } catch (error) {
      console.error('Error updating task:', error.message, error.stack);
      res.render('task-form', { task: req.body, error: 'Failed to update task' });
    }
  });


}
