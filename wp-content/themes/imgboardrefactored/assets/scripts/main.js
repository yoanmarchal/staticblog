function debounce (fn, delay) {
  let timer = null
  return () => {
    const context = this
    const args = arguments
    clearTimeout(timer)
    timer = setTimeout(() => {
      fn.apply(context, args)
    }, delay)
  }
}

function throttle (fn, threshold, scope) {
  threshold = threshold || 250
  let last
  let deferTimer

  return () => {
    const context = scope || this
    const now = new Date()
    const args = arguments

    if (last && now < last + threshold) {
      clearTimeout(deferTimer)
      deferTimer = setTimeout(() => {
        last = now
        fn.apply(context, args)
      }, threshold)
    } else {
      last = now
      fn.apply(context, args)
    }
  }
}

function loadImages (handler) {
  const imageCount = document.querySelectorAll('img').length
  const path = document.querySelector('#logo .ring')
  const length = path.getTotalLength()

  let loadedImageCount = 0

  path.style.transition = path.style.WebkitTransition = 'none'
  path.style.strokeDasharray = length + ' ' + length
  path.style.strokeDashoffset = -length
  path.getBoundingClientRect()
  path.style.transition = path.style.WebkitTransition = 'stroke-dashoffset 0.3s ease-in-out'

  if (imageCount > 0) {
    document.imgWatcher({
      selector: 'img',

      progress: () => {
        loadedImageCount++

        path.style.strokeDashoffset = -(length / loadedImageCount) + 'px'
      },

      always: () => {
        handler()

        if (loadedImageCount === imageCount) {
          path.style.strokeDashoffset = '0px'
        }
      },
      done: () => {
        handler()

        if (loadedImageCount === imageCount) {
          path.style.strokeDashoffset = '0px'
        }
      }
    })
  } else {
    handler()
    path.style.strokeDashoffset = '0px'
  }
}

// Fix for posts with no headers
function setPostNav (body) {
  const post = document.querySelector('.item-content')
  const header = document.querySelector('.slider, .featured')

  if (!header) {
    body.classList.remove('post-nav-open')
  }

  if (post && !header) {
    body.classList.add('post-nav-open')
  }

  if (post) {
    [].slice.call(document.querySelectorAll('.post-nav-link')).map(link => {
      const direction = link.getAttribute('data-direction')
      const url = post.getAttribute('data-' + direction + '-post')

      link.classList.toggle('inactive', url === window.location.href)

      link.setAttribute('href', url)
    })
  }
}

function postNavScrollHandler (body, header) {
  const link = document.querySelector('.post-nav-link')
  const showNav = body.scrollTop > header.clientHeight / 2 + link.clientHeight

  body.classList.toggle('post-nav-open', showNav)
}

function infiniteScrollHandler (body, grid, ajaxLoaderOptions) {
  const allowLoading = !(body.classList.contains('scroll-loading') || body.classList.contains('scroll-loading-disabled'))
  const loaded = grid.querySelectorAll('.item').length

  if (allowLoading) {
    document.ajaxLoader({
      container: '.grid',
      ajaxUrl: grid.getAttribute('data-ajax-url'),
      ajaxData: {
        action: 'load_posts',
        offset: loaded,
        category: grid.getAttribute('data-category-id')
      },
      replaceContent: false,
      beforeLoading: () => {
        body.classList.add('scroll-loading')
      },
      afterLoading: () => {
        const nbPosts = grid.querySelectorAll('.item').length

        loadImages(() => setTimeout(() => {
          if (nbPosts === loaded) {
            document.querySelector('.scroll-loader-text').innerHTML = 'All posts loaded.'
            body.classList.add('scroll-loading-disabled')
          }
          body.classList.remove('scroll-loading')
        }, 1000))
      },
      options: ajaxLoaderOptions
    })
  }
}

($ => {
  const Sage = {
    // All pages
    'common': {
      init: () => {
        const body = document.querySelector('body')
        const logo = document.querySelector('.brand-link')
        const searchForm = document.querySelector('.search-form')
        const menuItems = [].slice.call(document.querySelectorAll('.menu-item a'))
        let lastScrollPos = 0
        let headroom

        const hammer = new Hammer(body)

        const menuHandler = () => {
          body.classList.toggle('menu-open', !body.classList.contains('menu-open'))
        }

        const setMenuOpener = () => {
          const button = body.querySelector('button.menu')

          if (button) {
            body.querySelector('button.menu').addEventListener('click', menuHandler)
          }
        }

        function initSlider () {
          const slider = $(".slider")
          if (slider) {
            slider.glide({
                type: "carousel"
            })
          }
        }

        const afterLoading = container => {
          lastScrollPos = 0
          setPostNav(body)

          initSlider()

          loadImages(() => body.classList.remove('loading'))

          setMenuOpener()

          window.scroll(0, 0) // a changer si on est dans le cas d'un retour en arriere
        }

        const ajaxLoaderOptions = {
          wrapper: 'body',
          anchors: 'a[href*="' + window.location.host + '"]:not([target="_blank"]):not([href*="#"]):not([href*="/wp-admin/"]):not([href*="/uploads/"]):not([href*="wp-login.php"])',
          container: 'main',
          waitBeforeLoading: 500,

          beforeLoading: () => {
            body.classList.add('loading')
            body.classList.remove('post-nav-open')
          },

          afterLoading: afterLoading
        }

        function goTo (direction) {
          const post = document.querySelector('.item-content')
          const link = document.querySelector('[data-direction="' + direction + '"]')
          const noOverlays = !body.classList.contains('modal-open') && !body.classList.contains('menu-open')

          if (post && noOverlays) {
            link.click()
          }
        }

        if (is.not.mobile()) {
          headroom = new Headroom(logo)
          headroom.init()
        }

        setPostNav(body)

        initSlider()

        setMenuOpener()

        loadImages(() => body.classList.remove('loading'))

        document.ajaxLoader(ajaxLoaderOptions)

        logo.addEventListener('click', e => {
          if (e.button !== 1) {
            menuHandler()
            e.preventDefault()
          }
        })

        menuItems.map(item => item.addEventListener('click', () => {
          const container = item.parentNode
          const current = container.parentNode.querySelector('.current-menu-item')

          container.classList.add('current-menu-item')

          if (current) {
            current.classList.remove('current-menu-item')
          }

          menuHandler()
        }))

        // Search
        searchForm.addEventListener('submit', e => {
          const input = searchForm.querySelector('.search-field')
          const url = input.value ? searchForm.getAttribute('action') + '?s=' + input.value : null

          e.preventDefault()

          if (url) {
            document.ajaxLoader({
              container: 'main',
              ajaxUrl: url,
              waitBeforeLoading: 500,
              beforeLoading: () => {
                history.pushState(null, 'Résultats de la recherche', url)
                body.classList.add('loading')
                body.classList.remove('post-nav-open')
              },
              afterLoading: afterLoading
            })
            input.value = ''

            menuHandler()
          }
        })

        // Infinite scroll
        window.addEventListener('scroll', throttle(() => {
          const header = document.querySelector('.slider, .featured')
          const grid = document.querySelector('.grid')
          const scrollTop = body.scrollTop
          const goingDown = scrollTop > lastScrollPos

          if (header) {
            postNavScrollHandler(body, header)
          }

          if (grid && goingDown && scrollTop > body.clientHeight - window.innerHeight) {
            infiniteScrollHandler(body, grid, ajaxLoaderOptions)
          }
          lastScrollPos = scrollTop
        }, 150))

        // Keyboard navigation
        document.addEventListener('keydown', e => {
          if (e.keyCode === 37) {
            goTo('prev')
          }

          if (e.keyCode === 39) {
            goTo('next')
          }
        })

        // Touch navigation
        hammer.on('swiperight', () => {
          goTo('prev')
        })
        hammer.on('swipeleft', () => {
          goTo('next')
        })
      }
    }
  }

  // The routing fires all common scripts, followed by the page specific scripts.
  // Add additional events for more control over timing e.g. a finalize event
  const UTIL = {
    fire: (func, funcname, args) => {
      const namespace = Sage
      let fire

      funcname = (funcname === undefined) ? 'init' : funcname
      fire = func !== ''
      fire = fire && namespace[func]
      fire = fire && typeof namespace[func][funcname] === 'function'

      if (fire) {
        namespace[func][funcname](args)
      }
    },
    loadEvents: () => {
      const classes = document.body.className.replace(/-/g, '_').split(/\s+/)

      UTIL.fire('common')

      // Fire page-specific init JS, and then finalize JS
      classes.forEach(classnm => {
        UTIL.fire(classnm)
        UTIL.fire(classnm, 'finalize')
      })

      // Fire common finalize JS
      UTIL.fire('common', 'finalize')
    }
  }

  function ready (fn) {
    if (document.readyState !== 'loading') {
      fn()
    } else {
      document.addEventListener('DOMContentLoaded', fn)
    }
  }

  ready(UTIL.loadEvents)
})(jQuery)
