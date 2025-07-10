import { PrismaGrantRepository } from '@/lib/repositories/GrantRepository';
import { GrantServiceImpl } from '@/lib/services/GrantService';

// Dependency injection container
class Container {
  private static instance: Container;
  private repositories: Map<string, any> = new Map();
  private services: Map<string, any> = new Map();

  private constructor() {
    this.initializeDependencies();
  }

  static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }

  private initializeDependencies() {
    // Initialize repositories
    this.repositories.set('GrantRepository', new PrismaGrantRepository());
    
    // Initialize services with their dependencies
    const grantRepository = this.repositories.get('GrantRepository');
    this.services.set('GrantService', new GrantServiceImpl(grantRepository));
  }

  getGrantRepository() {
    return this.repositories.get('GrantRepository');
  }

  getGrantService() {
    return this.services.get('GrantService');
  }
}

// Export singleton instance
export const container = Container.getInstance(); 