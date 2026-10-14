import express from 'express';
import { createMemoriesService } from '../services/memories.js';

export function createMemoriesRouter(dependencies = {}) {
  const router = express.Router();
  const memoriesService = dependencies.memoriesService || createMemoriesService();

  router.get('/', async (request, response, next) => {
    try {
      const memories = await memoriesService.listMemories(request.query);
      response.json({ memories });
    } catch (error) {
      next(error);
    }
  });

  router.post('/', async (request, response, next) => {
    try {
      const memory = await memoriesService.createMemory(request.body);
      response.status(201).json({ memory });
    } catch (error) {
      next(error);
    }
  });

  router.get('/:id', async (request, response, next) => {
    try {
      const memory = await memoriesService.getMemory(request.params.id);
      response.json({ memory });
    } catch (error) {
      next(error);
    }
  });

  router.patch('/:id', async (request, response, next) => {
    try {
      const memory = await memoriesService.updateMemory(request.params.id, request.body);
      response.json({ memory });
    } catch (error) {
      next(error);
    }
  });

  router.post('/:id/sources', async (request, response, next) => {
    try {
      const source = await memoriesService.addSource(request.params.id, request.body);
      response.status(201).json({ source });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
