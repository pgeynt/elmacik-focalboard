// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useState} from 'react'
import {Link, Redirect, useLocation, useHistory} from 'react-router-dom'
import {FormattedMessage, useIntl} from 'react-intl'

import {useAppDispatch, useAppSelector} from '../store/hooks'
import {fetchMe, getLoggedIn, setMe} from '../store/users'

import Button from '../widgets/buttons/button'
import client from '../octoClient'
import './loginPage.scss'
import logo from '../../static/elmacik.png';

const LoginPage = () => {
    const intl = useIntl()
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [errorMessage, setErrorMessage] = useState('')
    const dispatch = useAppDispatch()
    const loggedIn = useAppSelector<boolean|null>(getLoggedIn)
    const queryParams = new URLSearchParams(useLocation().search)
    const history = useHistory()

    const handleLogin = async (): Promise<void> => {
        const logged = await client.login(username, password)
        if (logged) {
            await dispatch(fetchMe())
            if (queryParams) {
                history.push(queryParams.get('r') || '/')
            } else {
                history.push('/')
            }
        } else {
            setErrorMessage(intl.formatMessage({id: 'login.failed', defaultMessage: 'Giriş başarısız'}))
        }
    }

    if (loggedIn) {
        return <Redirect to={'/'}/>
    }

    return (
        <div className='AuthWrapper'>
            <div className='LoginPage'>
                <div className='auth-logo'>
                    <img src={logo} alt='Logo' />
                </div>
                <form
                    onSubmit={(e: React.FormEvent) => {
                        e.preventDefault()
                        handleLogin()
                    }}
                >
                    <div className='title'>
                        <FormattedMessage
                            id='login.log-in-title'
                            defaultMessage='Giriş Yap'
                        />
                    </div>
                    <div className='username'>
                        <input
                            id='login-username'
                            placeholder={intl.formatMessage({id: 'login.username-placeholder', defaultMessage: 'Kullanıcı adınızı girin'})}
                            value={username}
                            onChange={(e) => {
                                setUsername(e.target.value)
                                setErrorMessage('')
                            }}
                        />
                    </div>
                    <div className='password'>
                        <input
                            id='login-password'
                            type='password'
                            placeholder={intl.formatMessage({id: 'login.password-placeholder', defaultMessage: 'Şifrenizi girin'})}
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value)
                                setErrorMessage('')
                            }}
                        />
                    </div>
                    <Button
                        filled={true}
                        submit={true}
                    >
                        <FormattedMessage
                            id='login.log-in-button'
                            defaultMessage='Giriş Yap'
                        />
                    </Button>
                </form>
                <Link to='/register'>
                    <FormattedMessage
                        id='login.register-button'
                        defaultMessage='Hesabınız yoksa oluşturun'
                    />
                </Link>
                {errorMessage &&
                    <div className='error'>
                        {errorMessage}
                    </div>
                }
            </div>
        </div>
    )
}

export default React.memo(LoginPage)
