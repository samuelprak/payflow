import { ExecutionContext, UnauthorizedException } from "@nestjs/common"
import { Test, TestingModule } from "@nestjs/testing"
import { TenantFactory } from "src/tenant/factories/tenant.factory"
import { TenantGuard } from "src/tenant/guards/tenant.guard"
import { TenantRepository } from "src/tenant/repositories/tenant.repository"

describe("TenantGuard", () => {
  let module: TestingModule
  let guard: TenantGuard

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [
        TenantGuard,
        {
          provide: TenantRepository,
          useValue: {
            findOneByApiKey: jest.fn(),
          },
        },
      ],
    }).compile()

    guard = module.get(TenantGuard)
  })

  describe("canActivate", () => {
    it("returns true if tenant is found", async () => {
      const tenant = await new TenantFactory().make()
      const request = {
        headers: {
          "x-api-key": tenant.apiKey,
        },
      }
      const context = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(request),
        }),
      } as unknown as ExecutionContext

      jest
        .spyOn(module.get(TenantRepository), "findOneByApiKey")
        .mockResolvedValue(tenant)
      const result = await guard.canActivate(context)

      expect(result).toBe(true)
    })

    it("throws UnauthorizedException if tenant is not found", async () => {
      const request = {
        headers: {
          "x-api-key": "invalid-api-key",
        },
      }
      const context = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(request),
        }),
      } as unknown as ExecutionContext

      jest
        .spyOn(module.get(TenantRepository), "findOneByApiKey")
        .mockResolvedValue(null)

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException("Invalid x-api-key"),
      )
    })

    it("throws UnauthorizedException if no api key is provided", async () => {
      const request = {
        headers: {},
      }
      const context = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(request),
        }),
      } as unknown as ExecutionContext

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException("Header x-api-key is required"),
      )
    })
  })
})
