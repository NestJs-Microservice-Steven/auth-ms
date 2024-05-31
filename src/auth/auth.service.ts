import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { PrismaClient } from '@prisma/client';
import { LoginUserDto, RegisterUserDto } from './dto';

import * as bycrypt from 'bcrypt'
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from './dto/interface/jwt-payload.interface';
import { envs } from 'src/config';

@Injectable()
export class AuthService extends PrismaClient implements OnModuleInit{
	
	private readonly logger = new Logger('AuthService')

	constructor(private readonly jwtService: JwtService){
		super();
	}

	// con esto verificamos que nuestro codigo se conecte a MONGO :D 
	onModuleInit() {
		this.$connect();
		this.logger.log('Mongo Db Connected')
	}

	async signJWT(payload: JwtPayload){

		return this.jwtService.sign(payload)

	}

	async verifyToken(token: string){
		
		try{
			
			const { sub, iat, exp, ...user} = this.jwtService.verify(token, {
				secret: envs.jwtSecret
			})

			return {user, token: await this.signJWT(user)}

		}catch (err){
			
			console.log(err)
			throw new RpcException({
				status: 400,
				message: 'Invalid token'
			})
		}
	}


	async registerUser( registerUserDto: RegisterUserDto){

		const { email, password, name} = registerUserDto

		try {

			const user = await this.user.findUnique({
				where: {email},

			})

			
			if(user) {
				throw new RpcException({
					status: 400,
					message: 'El usuario ya existe'
				})
			}

			const newUser = await this.user.create({
				data: {
					email: email,
					name: name,
					password: bycrypt.hashSync(password, 10) // ENCRIPTAR CONTRASEÑA / HASH

				}

			})
			
			
			const { password: __, ...rest} = newUser

			return {
				user: rest,
				token: await this.signJWT(rest)
			}

		} catch (error) {
			throw new RpcException({
				status: 400,
				message: error.message
			})
		}
	}

	async loginUser( loginUserDto: LoginUserDto){

		const { email, password} = loginUserDto

		try {

			const user = await this.user.findUnique({
				where: {email},

			})

			
			if(!user) {
				throw new RpcException({
					status: 400,
					message: 'User / Password not valid'
				})
			}

			const isPasswordValid = bycrypt.compareSync( password, user.password)
			
			if( !isPasswordValid) {
				throw new RpcException({
					status: 400,
					message: 'User/ Password not valid'
				})
			}

			const { password: _, ...rest } = user
			
			return {
				user: rest,
				token: await this.signJWT(rest)
			}

		} catch (error) {
			throw new RpcException({
				status: 400,
				message: error.message
			})
		}
	}

	
}
