import {
	PrismaGrantRepository,
	type GrantRepository,
} from '@/lib/repositories/GrantRepository';
import {
	GrantServiceImpl,
	type GrantService,
} from '@/lib/services/GrantService';

// Dependency injection container
class Container {
	private static instance: Container;
	private readonly grantRepository: GrantRepository;
	private readonly grantService: GrantService;

	private constructor() {
		this.grantRepository = new PrismaGrantRepository();
		this.grantService = new GrantServiceImpl(this.grantRepository);
	}

	static getInstance(): Container {
		if (!Container.instance) {
			Container.instance = new Container();
		}
		return Container.instance;
	}

	getGrantRepository(): GrantRepository {
		return this.grantRepository;
	}

	getGrantService(): GrantService {
		return this.grantService;
	}
}

// Export singleton instance
export const container = Container.getInstance();
