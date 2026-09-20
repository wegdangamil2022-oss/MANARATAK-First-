export interface IController<IRequest, IResponse> {
  execute(request: IRequest): Promise<IResponse>;
}
