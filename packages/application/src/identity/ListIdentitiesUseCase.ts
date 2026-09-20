import { UseCase, Result, ResultFactory } from '@manaratak/core';
import { IIdentityRepository, IdentityType, LifeStatus } from '@manaratak/domain';
import { IdentityDto } from './dtos';
import { IdentityDtoMapper } from './mapper';

export interface ListIdentitiesInput {
  type?: IdentityType;
  status?: LifeStatus;
  limit?: number;
  offset?: number;
}

export interface ListIdentitiesOutput {
  items: IdentityDto[];
  total: number;
}

export class ListIdentitiesUseCase implements UseCase<ListIdentitiesInput, Result<ListIdentitiesOutput>> {
  constructor(private readonly identityRepository: IIdentityRepository) {}

  public async execute(input: ListIdentitiesInput): Promise<Result<ListIdentitiesOutput>> {
    try {
      const criteria = {
        type: input.type,
        status: input.status,
        limit: input.limit !== undefined ? Number(input.limit) : 20,
        offset: input.offset !== undefined ? Number(input.offset) : 0
      };

      const result = await this.identityRepository.findPaged(criteria);

      return ResultFactory.success({
        items: result.items.map(identity => IdentityDtoMapper.toDto(identity)),
        total: result.total
      });
    } catch (error: any) {
      return ResultFactory.failure(error.message);
    }
  }
}
