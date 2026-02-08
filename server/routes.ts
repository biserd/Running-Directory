import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/states", async (_req, res) => {
    const states = await storage.getStates();
    res.json(states);
  });

  app.get("/api/states/:slug", async (req, res) => {
    const state = await storage.getStateBySlug(req.params.slug);
    if (!state) return res.status(404).json({ message: "State not found" });
    res.json(state);
  });

  app.get("/api/states/:stateSlug/cities", async (req, res) => {
    const state = await storage.getStateBySlug(req.params.stateSlug);
    if (!state) return res.status(404).json({ message: "State not found" });
    const citiesList = await storage.getCitiesByState(state.id);
    res.json(citiesList);
  });

  app.get("/api/cities/:stateSlug/:citySlug", async (req, res) => {
    const result = await storage.getCityBySlug(req.params.stateSlug, req.params.citySlug);
    if (!result) return res.status(404).json({ message: "City not found" });
    res.json(result);
  });

  app.get("/api/races", async (req, res) => {
    const { state, distance, surface, city, year, month, limit } = req.query;
    const races = await storage.getRaces({
      state: state as string | undefined,
      distance: distance as string | undefined,
      surface: surface as string | undefined,
      city: city as string | undefined,
      year: year ? parseInt(year as string) : undefined,
      month: month ? parseInt(month as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json(races);
  });

  app.get("/api/races/:slug", async (req, res) => {
    const race = await storage.getRaceBySlug(req.params.slug);
    if (!race) return res.status(404).json({ message: "Race not found" });
    res.json(race);
  });

  app.get("/api/race-occurrences", async (req, res) => {
    const { raceId, year, month, limit } = req.query;
    const occurrences = await storage.getRaceOccurrences({
      raceId: raceId ? parseInt(raceId as string) : undefined,
      year: year ? parseInt(year as string) : undefined,
      month: month ? parseInt(month as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json(occurrences);
  });

  app.get("/api/routes", async (req, res) => {
    const { state, surface, type, city, limit } = req.query;
    const routes = await storage.getRoutes({
      state: state as string | undefined,
      surface: surface as string | undefined,
      type: type as string | undefined,
      city: city as string | undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json(routes);
  });

  app.get("/api/routes/:slug", async (req, res) => {
    const route = await storage.getRouteBySlug(req.params.slug);
    if (!route) return res.status(404).json({ message: "Route not found" });
    res.json(route);
  });

  app.get("/api/collections", async (req, res) => {
    const { type, limit } = req.query;
    const collectionsList = await storage.getCollections({
      type: type as string | undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json(collectionsList);
  });

  app.get("/api/collections/:slug", async (req, res) => {
    const collection = await storage.getCollectionBySlug(req.params.slug);
    if (!collection) return res.status(404).json({ message: "Collection not found" });
    res.json(collection);
  });

  return httpServer;
}
